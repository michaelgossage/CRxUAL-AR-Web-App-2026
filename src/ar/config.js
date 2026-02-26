import { setupCarouselText } from "./setups/carouselText.js";

// One .mind file containing multiple target images (index 0..N-1).

const mindTargetUrl = import.meta.env.BASE_URL + "/mindar_targets/test/test_target.mind";
const image1 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-20 at 22.06.45.png";
const image2 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.16.13.png";
const image3 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.16.22.png";
const image4 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.16.31.png";
const image5 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.16.48.png";
const image6 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.16.56.png";
const image7 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.17.09.png";
const image8 = import.meta.env.BASE_URL + "/doyeong-yung/Screenshot 2026-02-25 at 08.17.18.png";

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
          //image2,
          image3,
          //image4,
          image5,
          image6,
          image7,
          image8
        ],
        bodyText: `
This is a scrollable text panel rendered into a canvas texture in 3D space.

• Drag vertically on this panel to scroll.
• Drag horizontally anywhere else to spin the carousel.
• Tap the X to close the UI (so it can be triggered again by the marker).,
Today, the Earth's environment is rapidly deteriorating, and nature is constantly 
reminding us of its severity through natural disasters and extreme weather phenomena. 
The designer of this collection has first-hand experience of harsh environments and 
worsening weather conditions, having explored extreme terrains such as the Arctic, 
high altitude regions and deserts. As the frequency and intensity of natural disasters 
continues to increase, our environment is turning into a place where human survival is 
becoming increasingly difficult. Ultimately, there will come a time when humanity must 
adapt and survive in a world dominated by extreme climates, recognising the importance 
of coexisting with and caring for nature. The Nature Uniform Collection envisions the 
journey of an explorer who embraces a world transformed by extreme climates. This 
explorer encounters indigenous communities such as the Inuit of the Arctic and the 
Bedouin of the desert, learning from their traditions - including clothing, art and 
survival techniques - and drawing inspiration from their way of life. The collection 
visualises an explorer influenced by indigenous cultures, reflecting the fusion of 
traditional and modern elements.
Inspired by polar and desert environments, indigenous clothing and art, traditional 
craftsmanship and the spirit of backpackers exploring extreme terrain, this collection 
brings together the beauty of nature in the harshest of conditions. It harmonises the 
structural elements (patterns) of indigenous garments and their artistic craftsmanship 
with modern technology, high-performance fabrics and functional materials, creating a 
balance between tradition and innovation.
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
