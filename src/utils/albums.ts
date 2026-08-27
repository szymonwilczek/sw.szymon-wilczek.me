import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import exifr from "exifr";
import sharp from "sharp";
import { renderOrg } from "./org";

export interface PhotoItem {
  id: string;
  filename: string;
  src: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  date: Date;
  isPortrait: boolean;
  width: number;
  height: number;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  note?: string;
  gps?: {
    latitude: number;
    longitude: number;
    mapsUrl: string;
  };
}

export interface PhotoAlbum {
  id: string;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  date: Date;
  dateFormatted: string;
  coverImage: string;
  photoCount: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  photos: PhotoItem[];
  narrativeHtml?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function parseTitleFromFolder(folder: string): {
  title: string;
  dateSuffix?: { month: number; year: number };
} {
  const match = folder.match(/^(.*?)-(\d{2})(\d{4})$/);
  if (match) {
    const rawName = match[1].replace(/[_-]/g, " ");
    const title = rawName
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return { title, dateSuffix: { month, year } };
  }

  const rawName = folder.replace(/[_-]/g, " ");
  const title = rawName
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return { title };
}

let albumsCache: PhotoAlbum[] | null = null;

export async function getAllAlbums(): Promise<PhotoAlbum[]> {
  if (albumsCache && process.env.NODE_ENV === "production") {
    return albumsCache;
  }

  const imagesDir = path.resolve("./public/images");
  if (!fs.existsSync(imagesDir)) {
    return [];
  }

  const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
  const albumDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

  const albums: PhotoAlbum[] = [];

  for (const dir of albumDirs) {
    const folderName = dir.name;
    const albumPath = path.join(imagesDir, folderName);
    const folderFiles = fs.readdirSync(albumPath);

    const imageFiles = folderFiles.filter(
      (f) => /\.(jpe?g|png|webp|avif)$/i.test(f) && !f.startsWith("."),
    );

    if (imageFiles.length === 0) continue;

    const { title: derivedTitle, dateSuffix } = parseTitleFromFolder(folderName);

    let albumMetadata: {
      title?: string;
      description?: string;
      location?: string;
      cover?: string;
      photos?: Record<string, string>;
    } = {};
    const metaFile = path.join(albumPath, "album.json");
    if (fs.existsSync(metaFile)) {
      try {
        albumMetadata = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      } catch (err) {
        console.warn(`Failed to parse ${metaFile}:`, err);
      }
    }

    const photoNotes: Record<string, string> = { ...(albumMetadata.photos || {}) };

    for (const f of folderFiles) {
      if (f.endsWith(".txt")) {
        const baseName = path.parse(f).name;
        if (!photoNotes[baseName]) {
          photoNotes[baseName] = fs.readFileSync(path.join(albumPath, f), "utf8").trim();
        }
      }
    }

    let narrativeHtml: string | undefined;
    const orgFile = folderFiles.find(
      (f) =>
        f.endsWith(".org") &&
        !f.startsWith(".") &&
        !imageFiles.some((img) => img.startsWith(path.parse(f).name)),
    );

    if (orgFile) {
      try {
        const orgPath = path.join(albumPath, orgFile);
        const orgRaw = fs.readFileSync(orgPath, "utf8");

        const titleMatch = orgRaw.match(/^#\+title:\s*(.*)$/im);
        if (titleMatch && !albumMetadata.title) {
          albumMetadata.title = titleMatch[1].trim();
        }
        const descMatch = orgRaw.match(/^#\+description:\s*(.*)$/im);
        if (descMatch && !albumMetadata.description) {
          albumMetadata.description = descMatch[1].trim();
        }

        const photoSectionRegex = /^\*\*\s+(IMG_\w+)(?:\.\w+)?\s*\n([\s\S]*?)(?=^\*\*|\*|\Z)/gm;
        let pMatch;
        while ((pMatch = photoSectionRegex.exec(orgRaw)) !== null) {
          const photoKey = pMatch[1].trim();
          const photoComment = pMatch[2].trim();
          if (photoKey && photoComment) {
            photoNotes[photoKey] = photoComment;
          }
        }

        const generalOrg = orgRaw
          .replace(
            /(?:^|\n)\*\s+(?:Photo Notes|Field Notes|Photo Comments|Captions)[\s\S]*?(?=(?:\n\*\s+[^\*])|$)/i,
            "",
          )
          .trim();
        if (generalOrg) {
          narrativeHtml = await renderOrg(generalOrg);
        }
      } catch (err) {
        console.warn(`Failed to render Org narrative for ${folderName}:`, err);
      }
    }

    const photos: PhotoItem[] = [];
    let totalSizeBytes = 0;

    for (const file of imageFiles) {
      const filePath = path.join(albumPath, file);
      const fileStat = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      const sizeBytes = fileStat.size;
      totalSizeBytes += sizeBytes;

      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      let width = 0;
      let height = 0;
      let isPortrait = false;
      try {
        const meta = await sharp(fileBuffer).metadata();
        width = meta.width || 0;
        height = meta.height || 0;
        isPortrait = height > width;
      } catch {
        // fallback
      }

      let parsedExif: any = null;
      let gpsData: { latitude: number; longitude: number } | null = null;
      try {
        const [exif, rawGps] = await Promise.all([
          exifr.parse(fileBuffer, {
            pick: [
              "Make",
              "Model",
              "LensModel",
              "FNumber",
              "ExposureTime",
              "ISO",
              "FocalLength",
              "DateTimeOriginal",
              "CreateDate",
            ],
          }),
          exifr.gps(fileBuffer),
        ]);
        parsedExif = exif;
        gpsData = rawGps;
      } catch {
        // graceful fallback
      }

      let date = fileStat.mtime;
      if (parsedExif?.DateTimeOriginal) {
        const d = new Date(parsedExif.DateTimeOriginal);
        if (!isNaN(d.getTime())) date = d;
      } else if (parsedExif?.CreateDate) {
        const d = new Date(parsedExif.CreateDate);
        if (!isNaN(d.getTime())) date = d;
      } else if (dateSuffix) {
        date = new Date(dateSuffix.year, dateSuffix.month - 1, 1);
      }

      let camera: string | undefined;
      if (parsedExif?.Model) {
        const make = parsedExif.Make ? parsedExif.Make.trim() : "";
        const model = parsedExif.Model.trim();
        camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
      }

      let lens: string | undefined;
      if (parsedExif?.LensModel) {
        lens = parsedExif.LensModel.trim();
      }

      let focalLength: string | undefined;
      if (parsedExif?.FocalLength) {
        focalLength = `${Math.round(parsedExif.FocalLength)}mm`;
      }

      let aperture: string | undefined;
      if (parsedExif?.FNumber) {
        aperture = `f/${Number(parsedExif.FNumber.toFixed(1))}`;
      }

      let shutterSpeed: string | undefined;
      if (parsedExif?.ExposureTime) {
        const exp = parsedExif.ExposureTime;
        shutterSpeed = exp < 1 && exp > 0 ? `1/${Math.round(1 / exp)}s` : `${exp}s`;
      }

      let iso: string | undefined;
      if (parsedExif?.ISO) {
        iso = `ISO ${parsedExif.ISO}`;
      }

      let gps: PhotoItem["gps"];
      if (typeof gpsData?.latitude === "number" && typeof gpsData?.longitude === "number") {
        const lat = gpsData.latitude;
        const lon = gpsData.longitude;
        gps = {
          latitude: lat,
          longitude: lon,
          mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
        };
      }

      const photoId = path.parse(file).name;
      const note = photoNotes[photoId] || photoNotes[file];

      photos.push({
        id: photoId,
        filename: file,
        src: `/images/${folderName}/${file}`,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        sha256,
        date,
        isPortrait,
        width,
        height,
        camera,
        lens,
        focalLength,
        aperture,
        shutterSpeed,
        iso,
        note,
        gps,
      });
    }

    photos.sort((a, b) => a.date.getTime() - b.date.getTime());

    const earliestDate = photos.length > 0 ? photos[0].date : new Date();
    const dateFormatted = earliestDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const coverImage = albumMetadata.cover
      ? `/images/${folderName}/${albumMetadata.cover}`
      : photos[0].src;

    albums.push({
      id: folderName,
      slug: folderName,
      title: albumMetadata.title || derivedTitle,
      description: albumMetadata.description,
      location: albumMetadata.location,
      date: earliestDate,
      dateFormatted,
      coverImage,
      photoCount: photos.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      photos,
      narrativeHtml,
    });
  }

  albums.sort((a, b) => b.date.getTime() - a.date.getTime());

  albumsCache = albums;
  return albums;
}

export async function getAlbumBySlug(slug: string): Promise<PhotoAlbum | null> {
  const all = await getAllAlbums();
  return all.find((a) => a.slug === slug || a.id === slug) || null;
}
