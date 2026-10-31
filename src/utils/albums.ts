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
  thumbSrc: string;
  sheetSrc: string;
  sheetAvif?: string;
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
  country?: string;
  terrain: string[];
  stampNum: string;
  date: Date;
  dateFormatted: string;
  coverImage: string;
  coverThumb: string;
  coverAvif?: string;
  photoCount: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  photos: PhotoItem[];
  narrativeHtml?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const unit = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${parseFloat((bytes / Math.pow(unit, i)).toFixed(2))} ${sizes[i]}`;
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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return { title, dateSuffix: { month, year } };
  }

  const rawName = folder.replace(/[_-]/g, " ");
  const title = rawName
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
  const albumDirs = entries.filter(
    (entry) => entry.isDirectory() && entry.name !== "thumbs" && !entry.name.startsWith("."),
  );

  const albums: PhotoAlbum[] = [];

  for (const folder of albumDirs) {
    const folderName = folder.name;
    const albumPath = path.join(imagesDir, folderName);
    const folderFiles = fs.readdirSync(albumPath);

    const imageFiles = folderFiles.filter(
      (fileName) => /\.(jpe?g|png)$/i.test(fileName) && !fileName.startsWith("."),
    );

    if (imageFiles.length === 0) continue;

    const { title: derivedTitle, dateSuffix } = parseTitleFromFolder(folderName);

    let albumMetadata: {
      title?: string;
      description?: string;
      location?: string;
      country?: string;
      terrain?: string[];
      cover?: string;
      photos?: Record<string, string>;
    } = {};
    const metaFile = path.join(albumPath, "album.json");
    if (fs.existsSync(metaFile)) {
      try {
        albumMetadata = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      } catch (error) {
        console.warn(`Failed to parse ${metaFile}:`, error);
      }
    }

    const photoNotes: Record<string, string> = { ...(albumMetadata.photos || {}) };

    for (const fileName of folderFiles) {
      if (fileName.endsWith(".txt")) {
        const baseName = path.parse(fileName).name;
        if (!photoNotes[baseName]) {
          photoNotes[baseName] = fs.readFileSync(path.join(albumPath, fileName), "utf8").trim();
        }
      }
    }

    let narrativeHtml: string | undefined;
    const orgFile = folderFiles.find(
      (fileName) =>
        fileName.endsWith(".org") &&
        !fileName.startsWith(".") &&
        !imageFiles.some((image) => image.startsWith(path.parse(fileName).name)),
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
      } catch (error) {
        console.warn(`Failed to render Org narrative for ${folderName}:`, error);
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
              "FocalLengthIn35mmFormat",
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
        const parsed = new Date(parsedExif.DateTimeOriginal);
        if (!isNaN(parsed.getTime())) date = parsed;
      } else if (parsedExif?.CreateDate) {
        const parsed = new Date(parsedExif.CreateDate);
        if (!isNaN(parsed.getTime())) date = parsed;
      } else if (dateSuffix) {
        date = new Date(dateSuffix.year, dateSuffix.month - 1, 1);
      }

      let camera: string | undefined;
      if (parsedExif?.Model) {
        const make = parsedExif.Make ? parsedExif.Make.trim() : "";
        const model = parsedExif.Model.trim();
        camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
      }

      let focalLength: string | undefined;
      if (parsedExif?.FocalLengthIn35mmFormat) {
        focalLength = `${Math.round(parsedExif.FocalLengthIn35mmFormat)}mm`;
      } else if (parsedExif?.FocalLength) {
        focalLength = `${Math.round(parsedExif.FocalLength)}mm`;
      }

      let lens: string | undefined;
      if (parsedExif?.LensModel) {
        const lensModel = parsedExif.LensModel.trim();
        if (/iphone.*camera/i.test(lensModel)) {
          const focal35 = parsedExif.FocalLengthIn35mmFormat;
          const fPhys = parsedExif.FocalLength;
          if (focal35 <= 16 || (fPhys !== undefined && fPhys < 3.5) || /2\.22/i.test(lensModel)) {
            lens = "Ultra Wide (13mm)";
          } else if (
            focal35 >= 70 ||
            (fPhys !== undefined && fPhys >= 10) ||
            /15\.66/i.test(lensModel)
          ) {
            lens = "Telephoto (120mm)";
          } else if (/front/i.test(lensModel)) {
            lens = "Front Camera (23mm)";
          } else {
            lens = "Main (24mm)";
          }
        } else {
          lens = lensModel
            .replace(/^apple\s+/i, "")
            .replace(/back\s+(triple|dual|single)?\s*camera\s*/i, "")
            .trim();
        }
      }

      let aperture: string | undefined;
      if (parsedExif?.FNumber) {
        aperture = `f/${Number(parsedExif.FNumber.toFixed(1))}`;
      }

      let shutterSpeed: string | undefined;
      if (parsedExif?.ExposureTime) {
        const exposure = parsedExif.ExposureTime;
        shutterSpeed =
          exposure < 1 && exposure > 0 ? `1/${Math.round(1 / exposure)}s` : `${exposure}s`;
      }

      let iso: string | undefined;
      if (parsedExif?.ISO) {
        iso = `ISO ${parsedExif.ISO}`;
      }

      let gps: PhotoItem["gps"];
      if (typeof gpsData?.latitude === "number" && typeof gpsData?.longitude === "number") {
        const latitude = gpsData.latitude;
        const longitude = gpsData.longitude;
        gps = {
          latitude,
          longitude,
          mapsUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
        };
      }

      const photoId = path.parse(file).name;
      const note = photoNotes[photoId] || photoNotes[file];
      const thumbFsPath = path.join(albumPath, "thumbs", `${photoId}.webp`);
      const thumbSrc = fs.existsSync(thumbFsPath)
        ? `/images/${folderName}/thumbs/${photoId}.webp`
        : `/images/${folderName}/${file}`;
      const sheetSrc = fs.existsSync(path.join(albumPath, "thumbs", `${photoId}-600.webp`))
        ? `/images/${folderName}/thumbs/${photoId}-600.webp`
        : thumbSrc;
      const sheetAvif = fs.existsSync(path.join(albumPath, "thumbs", `${photoId}-600.avif`))
        ? `/images/${folderName}/thumbs/${photoId}-600.avif`
        : undefined;

      photos.push({
        id: photoId,
        filename: file,
        src: `/images/${folderName}/${file}`,
        thumbSrc,
        sheetSrc,
        sheetAvif,
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

    photos.sort((former, latter) => former.date.getTime() - latter.date.getTime());

    const earliestDate = photos.length > 0 ? photos[0].date : new Date();
    const albumDate = dateSuffix
      ? new Date(dateSuffix.year, dateSuffix.month - 1, 1)
      : earliestDate;
    const dateFormatted = albumDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const coverImage = albumMetadata.cover
      ? `/images/${folderName}/${albumMetadata.cover}`
      : photos.length > 0
        ? photos[0].src
        : "";
    const coverPhotoId = albumMetadata.cover
      ? path.parse(albumMetadata.cover).name
      : photos.length > 0
        ? photos[0].id
        : "";
    const cover600FsPath = coverPhotoId
      ? path.join(albumPath, "thumbs", `${coverPhotoId}-600.webp`)
      : "";
    const coverThumbFsPath = coverPhotoId
      ? path.join(albumPath, "thumbs", `${coverPhotoId}.webp`)
      : "";
    const coverThumb =
      cover600FsPath && fs.existsSync(cover600FsPath)
        ? `/images/${folderName}/thumbs/${coverPhotoId}-600.webp`
        : coverThumbFsPath && fs.existsSync(coverThumbFsPath)
          ? `/images/${folderName}/thumbs/${coverPhotoId}.webp`
          : coverImage;
    const coverAvifFsPath = coverPhotoId
      ? path.join(albumPath, "thumbs", `${coverPhotoId}-600.avif`)
      : "";
    const coverAvif =
      coverAvifFsPath && fs.existsSync(coverAvifFsPath)
        ? `/images/${folderName}/thumbs/${coverPhotoId}-600.avif`
        : undefined;

    albums.push({
      id: folderName,
      slug: folderName,
      title: albumMetadata.title || derivedTitle,
      description: albumMetadata.description,
      location: albumMetadata.location,
      country: albumMetadata.country,
      terrain: albumMetadata.terrain ?? [],
      stampNum: "",
      date: albumDate,
      dateFormatted,
      coverImage,
      coverThumb,
      coverAvif,
      photoCount: photos.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      photos,
      narrativeHtml,
    });
  }

  albums.sort(
    (former, latter) =>
      latter.date.getTime() - former.date.getTime() ||
      (latter.photos[0]?.date.getTime() ?? 0) - (former.photos[0]?.date.getTime() ?? 0),
  );

  // stamps are numbered in the order the trips happened, oldest first
  albums.forEach((album, i) => {
    album.stampNum = String(albums.length - i).padStart(2, "0");
  });

  albumsCache = albums;
  return albums;
}
