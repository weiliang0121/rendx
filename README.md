# Dye

A 2D visualization rendering engine.

Dye is the pure rendering layer extracted from [yotta-vis](https://github.com/user/yotta-vis), containing no chart/bind�business logic.

## Packages

| Package            | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `@dye/types`       | Global base TypeScript type definitions (Point, Mat2d, AO, Size, etc.)       |
| `@dye/bounding`    | Bounding box computation                                                     |
| `@dye/path`        | 2D path building and parsing                                                 |
| `@dye/ease`        | Easing functions                                                             |
| `@dye/util`        | General utility functions (array, math, uid, string, etc.)                   |
| `@dye/style`       | DOM/SVG element attribute and style utilities                                |
| `@dye/curve`       | Curve interpolation algorithms (linear, natural, bump, monotone, step)       |
| `@dye/measure`     | Text measurement, font metrics, canvas metrics                               |
| `@dye/interpolate` | Interpolators (number, color, matrix, vector)                                |
| `@dye/shape`       | Basic shape generators (circle, line, rect, area, sector, arc, symbol, etc.) |
| `@dye/gradient`    | Gradient processing                                                          |
| `@dye/animation`   | Animation timeline and keyframe system                                       |
| `@dye/renderer`    | Low-level renderer interface definitions                                     |
| `@dye/canvas`      | Canvas2D rendering implementation                                            |
| `@dye/svg`         | SVG rendering implementation                                                 |
| `@dye/engine`      | Scene graph engine (Graphics/Node/Group/Scene, event system, scheduler, App) |

## Dependency Layers

```
Layer 0 (zero deps):  types, bounding, path, ease
Layer 1:              util, style, curve, measure, interpolate
Layer 2:              shape, gradient, animation
Layer 3:              renderer, canvas, svg
Layer 4:              engine
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## Tech Stack

- **Package Manager**: pnpm workspace
- **Build**: Vite (library mode) + TypeScript
- **Task Orchestration**: Turborepo
- **Versioning**: Changesets
- **Code Quality**: ESLint + Prettier, commitlint, husky + lint-staged

## License

MIT © wei.liang
