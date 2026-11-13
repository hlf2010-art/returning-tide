// Lookalike parameters for the crossing's four named EVs (see carbody.js). NOT licensed models: published
// dimensions + silhouettes and light signatures read from press photographs; no logos.
import { curve } from './carbody.js';
const W = (w, pts) => curve(pts.map(([t, f]) => [t, (w / 2) * f]));
export const CARS = {
  'nio-et5': {           // NIO ET5: low fastback sedan, split slim headlamps, full-width tail bar, roof "watchtower"
    name: 'NIO ET5', length: 4.79, width: 1.96, height: 1.499, wheelbase: 2.888, wheelD: 0.70, frontOverhang: 0.93, paint: 0xc3c8cc,
    halfWidth: W(1.92, [[0, 0.82], [0.04, 0.95], [0.12, 1], [0.84, 1], [0.94, 0.94], [1, 0.74]]),
    sill: curve([[0, 0.44], [0.05, 0.3], [0.12, 0.19], [0.9, 0.19], [0.96, 0.27], [1, 0.36]]),
    belt: curve([[0, 0.86], [0.07, 0.95], [0.3, 0.93], [0.62, 0.9], [0.8, 0.8], [0.96, 0.68], [1, 0.56]]),
    deck: curve([[0, 0.88], [0.07, 0.98], [0.3, 0.96], [0.62, 0.93], [0.8, 0.84], [0.96, 0.71], [1, 0.58]]),
    roof: curve([[0.07, 0.95], [0.14, 1.12], [0.24, 1.33], [0.36, 1.44], [0.47, 1.45], [0.56, 1.3], [0.63, 0.92]]),
    tC: 0.07, tA: 0.63, tumble: curve([[0, 0.2], [0.5, 0.22], [1, 0.2]]), round: () => 1, barrel: 0.03,
    head: [{ t: 0.993, y: 0.72, x0: -0.98, x1: -0.62, thick: 0.022 }, { t: 0.993, y: 0.72, x0: 0.62, x1: 0.98, thick: 0.022 }, { t: 0.997, y: 0.55, x0: -0.9, x1: -0.7, thick: 0.03 }, { t: 0.997, y: 0.55, x0: 0.7, x1: 0.9, thick: 0.03 }],
    tail: [{ t: 0.006, y: 0.9, thick: 0.02 }],
    lidar: 0.6, blackRoof: true,
  },
  'li-l9': {             // Li Auto L9: tall boxy six-seat SUV, full-width front and rear light bars
    name: 'Li Auto L9', length: 5.218, width: 1.998, height: 1.8, wheelbase: 3.105, wheelD: 0.77, frontOverhang: 0.98, paint: 0x8e9a93,
    halfWidth: W(1.96, [[0, 0.92], [0.04, 0.98], [0.1, 1], [0.9, 1], [0.97, 0.98], [1, 0.93]]),
    sill: curve([[0, 0.52], [0.04, 0.38], [0.1, 0.24], [0.9, 0.24], [0.95, 0.34], [1, 0.46]]),
    belt: curve([[0, 1.08], [0.08, 1.11], [0.7, 1.09], [0.84, 1.05], [0.97, 1.0], [1, 0.9]]),
    deck: curve([[0, 1.1], [0.08, 1.14], [0.7, 1.12], [0.84, 1.09], [0.97, 1.03], [1, 0.92]]),
    roof: curve([[0.02, 1.1], [0.05, 1.68], [0.1, 1.76], [0.56, 1.77], [0.63, 1.66], [0.7, 1.1]]),
    tC: 0.02, tA: 0.7, tumble: curve([[0, 0.14], [1, 0.14]]), round: () => 0.8, barrel: 0.02,
    head: [{ t: 0.996, y: 0.98, thick: 0.028 }, { t: 0.997, y: 0.76, x0: -0.92, x1: -0.62, thick: 0.035 }, { t: 0.997, y: 0.76, x0: 0.62, x1: 0.92, thick: 0.035 }],
    tail: [{ t: 0.004, y: 1.12, thick: 0.03 }],
    lidar: 0.69, trimBright: true,
  },
  'luxeed-r7': {         // Luxeed R7: coupe-SUV, sweeping fastback into a spoiler, thin through-type front strip, winged tail bar
    name: 'Luxeed R7', length: 4.956, width: 1.999, height: 1.656, wheelbase: 2.95, wheelD: 0.74, frontOverhang: 0.95, paint: 0xc8722f,
    halfWidth: W(1.96, [[0, 0.86], [0.05, 0.97], [0.12, 1], [0.86, 1], [0.95, 0.93], [1, 0.76]]),
    sill: curve([[0, 0.46], [0.06, 0.32], [0.12, 0.21], [0.9, 0.21], [0.96, 0.3], [1, 0.4]]),
    belt: curve([[0, 0.98], [0.08, 1.03], [0.66, 1.0], [0.82, 0.92], [0.97, 0.8], [1, 0.68]]),
    deck: curve([[0, 1.02], [0.08, 1.06], [0.66, 1.03], [0.82, 0.95], [0.97, 0.83], [1, 0.7]]),
    roof: curve([[0.06, 1.04], [0.12, 1.24], [0.24, 1.5], [0.38, 1.63], [0.5, 1.64], [0.58, 1.46], [0.66, 1.0]]),
    tC: 0.06, tA: 0.66, tumble: curve([[0, 0.22], [1, 0.2]]), round: () => 1, barrel: 0.03,
    head: [{ t: 0.993, y: 0.84, thick: 0.02 }, { t: 0.996, y: 0.66, x0: -0.88, x1: -0.66, thick: 0.03 }, { t: 0.996, y: 0.66, x0: 0.66, x1: 0.88, thick: 0.03 }],
    tail: [{ t: 0.006, y: 1.0, thick: 0.022 }],
    lidar: 0.62,
  },
  'aito-m9': {           // AITO M9: large SUV, through-type top light bar over big projector clusters, full-width tail
    name: 'AITO M9', length: 5.23, width: 1.999, height: 1.8, wheelbase: 3.11, wheelD: 0.77, frontOverhang: 1.0, paint: 0x3f4a57,
    halfWidth: W(1.96, [[0, 0.92], [0.04, 0.98], [0.1, 1], [0.9, 1], [0.97, 0.97], [1, 0.9]]),
    sill: curve([[0, 0.5], [0.04, 0.37], [0.1, 0.24], [0.9, 0.24], [0.95, 0.34], [1, 0.44]]),
    belt: curve([[0, 1.05], [0.08, 1.1], [0.72, 1.08], [0.85, 1.03], [0.97, 0.98], [1, 0.88]]),
    deck: curve([[0, 1.07], [0.08, 1.13], [0.72, 1.11], [0.85, 1.07], [0.97, 1.01], [1, 0.9]]),
    roof: curve([[0.03, 1.08], [0.07, 1.66], [0.12, 1.75], [0.55, 1.76], [0.63, 1.67], [0.71, 1.08]]),
    tC: 0.03, tA: 0.71, tumble: curve([[0, 0.16], [1, 0.16]]), round: () => 0.9, barrel: 0.025,
    head: [{ t: 0.996, y: 0.97, thick: 0.015 }, { t: 0.997, y: 0.8, x0: -0.93, x1: -0.6, thick: 0.05 }, { t: 0.997, y: 0.8, x0: 0.6, x1: 0.93, thick: 0.05 }],
    tail: [{ t: 0.004, y: 1.06, thick: 0.035 }],
    lidar: 0.7, trimBright: true,
  },
};
