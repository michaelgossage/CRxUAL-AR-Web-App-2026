import { setupCarouselText } from "./setups/carouselText.js";

// One .mind file containing multiple target images (index 0..N-1).

const mindTargetUrl = import.meta.env.BASE_URL + "/mindar_targets/test/test_target.mind";
const image1 = import.meta.env.BASE_URL + "/mindar_targets/test/Screenshot 2026-02-20 at 22.06.45.png";
export const AR_CONFIG = {
  mindFileUrl:
    //"https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind",
    mindTargetUrl,

  // Target index -> setup
  
  targets: [
    {
      id: "target-0",
      index: 0,
      setup: setupCarouselText,
      setupConfig: {
        carouselImages: [
          image1,
          "https://picsum.photos/id/1011/900/900",
          "https://picsum.photos/id/1011/900/900",
          "https://picsum.photos/id/1011/900/900",
          "https://picsum.photos/id/1011/900/900"
        ],
        bodyText: `
This is a scrollable text panel rendered into a canvas texture in 3D space.

• Drag vertically on this panel to scroll.
• Drag horizontally anywhere else to spin the carousel.
• Tap the X to close the UI (so it can be triggered again by the marker).
`.trim()
      }
    }

    // Add more targets like:
    // {
    //   id: "target-1",
    //   index: 1,
    //   setup: setupSomeOtherReveal,
    //   setupConfig: { ... }
    // }
  ]
};
