// timber and roofs: faces, posts, gables, plaques

import { mix, roundCoord } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyBox,
  wobblySegment,
  addLine,
  addSolid,
  addText,
  inked,
  brushStroke,
  projectAll,
} from "./pen.js";
import { thatchStrokes } from "./garden.js";

// shared pieces of architecture
function face(group, rand, project, points, fill, tones, width, wobble) {
  const outline = wobblyPolygon(rand, projectAll(project, points), wobble ?? 0.8);
  addSolid(group, outline, mix(fill, tones.paper, 0.25), 1);
  inked(group, rand, outline, fill, tones.ink, width ?? 1.2);
}

function post(group, rand, project, x, z, y0, y1, tones, width) {
  addLine(
    group,
    wobblySegment(rand, project(x, z, y0), project(x, z, y1), 0.5, 3),
    tones.woodDk,
    width ?? 4.5,
    0.9,
    true,
  );
  addLine(
    group,
    wobblySegment(rand, project(x, z, y0), project(x, z, y1), 0.5, 3),
    tones.ink,
    1,
    0.8,
  );
}

function gableRoof(
  group,
  rand,
  project,
  width,
  depth,
  wallHeight,
  roofHeight,
  overhang,
  tones,
  kind,
) {
  const eave = wallHeight - 4,
    ridgeY = wallHeight + roofHeight,
    midDepth = depth / 2;
  const isThatch = kind === "thatch",
    fill = isThatch ? tones.thatch : tones.iron;
  addSolid(
    group,
    wobblyPolygon(
      rand,
      projectAll(project, [
        [-overhang, midDepth, ridgeY],
        [width + overhang, midDepth, ridgeY],
        [width + overhang, depth + overhang, eave],
        [-overhang, depth + overhang, eave],
      ]),
      1.5,
    ),
    mix(fill, tones.ink, 0.15),
    1,
  );
  face(
    group,
    rand,
    project,
    [
      [width + overhang * 0.4, -overhang, eave],
      [width + overhang * 0.4, depth + overhang, eave],
      [width + overhang * 0.4, midDepth, ridgeY - 6],
    ],
    isThatch ? tones.earth : tones.kura,
    tones,
    1.1,
    1,
  );
  face(
    group,
    rand,
    project,
    [
      [-overhang, -overhang, eave],
      [width + overhang, -overhang, eave],
      [width + overhang, midDepth, ridgeY],
      [-overhang, midDepth, ridgeY],
    ],
    fill,
    tones,
    1.3,
    1.5,
  );
  if (isThatch) {
    thatchStrokes(
      group,
      rand,
      project(-overhang, midDepth, ridgeY),
      project(width + overhang, midDepth, ridgeY),
      project(-overhang, -overhang, eave),
      project(width + overhang, -overhang, eave),
      Math.round(width / 2.2),
      tones,
    );
    face(
      group,
      rand,
      project,
      [
        [-overhang, -overhang, eave],
        [width + overhang, -overhang, eave],
        [width + overhang, -overhang, eave - 14],
        [-overhang, -overhang, eave - 14],
      ],
      tones.thatchDk,
      tones,
      1.2,
      0.8,
    );
    for (let x = -overhang + 3; x < width + overhang; x += 4 + rand() * 3)
      addLine(
        group,
        wobblySegment(
          rand,
          project(x, -overhang, eave - 1),
          project(x + jitter(rand, 1), -overhang, eave - 13),
          0.3,
          1,
        ),
        tones.ink,
        0.6,
        0.45,
        true,
      );
    brushStroke(
      group,
      rand,
      [
        project(-overhang - 4, midDepth, ridgeY + 3),
        project(width / 2, midDepth, ridgeY + 5),
        project(width + overhang + 4, midDepth, ridgeY + 3),
      ],
      9,
      tones.ink,
      0.9,
      { blunt: true, tip: 0.6 },
    );
    for (let x = 10; x < width; x += 34) {
      const point = project(x, midDepth, ridgeY + 4);
      addLine(
        group,
        `M${roundCoord(point[0] - 6)} ${roundCoord(point[1] - 9)} L${roundCoord(point[0] + 6)} ${roundCoord(point[1] + 3)} M${roundCoord(point[0] + 6)} ${roundCoord(point[1] - 9)} L${roundCoord(point[0] - 6)} ${roundCoord(point[1] + 3)}`,
        tones.ink,
        1.6,
        0.85,
      );
    }
  } else {
    for (let x = -overhang + 6; x < width + overhang; x += 7)
      addLine(
        group,
        wobblySegment(
          rand,
          project(x, midDepth, ridgeY - 1),
          project(x, -overhang, eave + 1),
          0.4,
          2,
        ),
        tones.ink,
        0.9,
        0.55,
        true,
      );
    face(
      group,
      rand,
      project,
      [
        [-overhang, -overhang, eave],
        [width + overhang, -overhang, eave],
        [width + overhang, -overhang, eave - 6],
        [-overhang, -overhang, eave - 6],
      ],
      tones.ink,
      tones,
      1,
      0.5,
    );
    brushStroke(
      group,
      rand,
      [
        project(-overhang - 6, midDepth, ridgeY + 1),
        project(width / 2, midDepth, ridgeY + 2),
        project(width + overhang + 6, midDepth, ridgeY + 1),
      ],
      8,
      tones.ink,
      0.95,
      { blunt: true, tip: 0.8 },
    );
    [
      [-overhang - 6, 1],
      [width + overhang + 6, -1],
    ].forEach(([x, side]) => {
      const point = project(x, midDepth, ridgeY + 2);
      brushStroke(
        group,
        rand,
        [
          [point[0], point[1] + 4],
          [point[0] - side * 3, point[1] - 6],
          [point[0] - side * 9, point[1] - 9],
        ],
        6,
        tones.ink,
        0.9,
      );
    });
  }
}

function plaque(group, rand, x, y, width, height, text, font, fontSize, tones) {
  inked(
    group,
    rand,
    wobblyBox(rand, x - width / 2, y - height / 2, x + width / 2, y + height / 2, 0.5),
    tones.woodLt,
    tones.ink,
    1,
  );
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: fontSize,
    font,
    fill: tones.ink,
  });
}

export { face, post, gableRoof, plaque };
