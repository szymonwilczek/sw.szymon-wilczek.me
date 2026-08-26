import exifr from "exifr";
import fs from "node:fs";
import path from "node:path";

export interface ExifData {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  dateTime?: string;
}

/**
 * Safely extracts and formats EXIF metadata from an image path.
 * Searches in the public directory or project root.
 */
export async function getExifData(imagePath: string): Promise<ExifData | null> {
  if (!imagePath) return null;

  try {
    const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    const resolvedPath = path.resolve("./public", cleanPath);

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const parsed = await exifr.parse(fileBuffer, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FNumber",
        "ExposureTime",
        "ISO",
        "FocalLength",
        "DateTimeOriginal",
      ],
    });

    if (!parsed) return null;

    const data: ExifData = {};

    // Camera Make & Model
    if (parsed.Model) {
      const make = parsed.Make ? parsed.Make.trim() : "";
      const model = parsed.Model.trim();
      data.camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
    } else if (parsed.Make) {
      data.camera = parsed.Make.trim();
    }

    // Lens Model
    if (parsed.LensModel) {
      data.lens = parsed.LensModel.trim();
    }

    // Focal Length
    if (parsed.FocalLength) {
      data.focalLength = `${Math.round(parsed.FocalLength)}mm`;
    }

    // Aperture (f-stop)
    if (parsed.FNumber) {
      data.aperture = `f/${Number(parsed.FNumber.toFixed(1))}`;
    }

    // Shutter Speed
    if (parsed.ExposureTime) {
      const exp = parsed.ExposureTime;
      if (exp < 1 && exp > 0) {
        data.shutterSpeed = `1/${Math.round(1 / exp)}s`;
      } else {
        data.shutterSpeed = `${exp}s`;
      }
    }

    // ISO
    if (parsed.ISO) {
      data.iso = `ISO ${parsed.ISO}`;
    }

    // Capture Date
    if (parsed.DateTimeOriginal) {
      const d = new Date(parsed.DateTimeOriginal);
      if (!isNaN(d.getTime())) {
        data.dateTime = d.toISOString().split("T")[0];
      }
    }

    const hasAnyField = Object.keys(data).length > 0;
    return hasAnyField ? data : null;
  } catch (error) {
    // if image has no EXIF or cannot be parsed,
    // fail gracefully without throwing
    return null;
  }
}
