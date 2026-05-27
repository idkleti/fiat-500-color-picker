# Fiat Picker

Fiat Picker is a 3D web configurator that lets you customize the colors of a Fiat 500 Abarth directly in your browser. It’s designed to be a simple, lightweight tool to visualize the car with different paint jobs and in various environments.

## COMING SOON:
* Changes to mobile layout
* Background alt translations
* Ability to change rims/wheels colour
* Adding Mazda Miata Mx-5 NA model to customize

### What it does
The app provides an interactive 3D model that you can rotate and zoom. Key features include:
* **Color Customization:** You can choose a single color for the whole car or switch to "Two colors" mode to paint the roof and body separately.
* **Environment Swapping:** Change the background to see how the car's reflections and lighting change in different settings (city, mountains, seaside, etc.).
* **Snap a Photo:** There is a dedicated button to take a high-quality screenshot of your configuration and save it to your device.
* **Language Support:** The interface is available in both English and Italian.

### How it works
The project is built using standard web technologies (HTML, CSS, and JavaScript). The 3D engine is powered by **Three.js**, which handles the scene rendering, lighting, and the GLTF model loading.

The code is organized into a few main parts:
* `configurator.js` contains the logic for the 3D scene, material updates, and the screenshot system.
* `i18n.js` manages the text translations.
* `style.css` handles the UI layout, ensuring it works well on both desktop and mobile screens.

To get realistic reflections on the car's paint, I used a PMREM (Prefiltered Mipmapped Radiance Environment Map) generator that simulates real-world lighting based on the environment.

### Credits and Assets
This project uses the following resources:

**3D Model:**
* [2014 Abarth 500 1.4 16V](https://sketchfab.com/3d-models/2014-abarth-500-14-16v-a7fe3d6fa0a44c83a62f21853256d166) by [beastf9](https://sketchfab.com/ddiaz-design) (licensed under CC BY 4.0).

**Background Photos:**
* [Road with green trees](https://www.pexels.com/it-it/foto/strada-alberi-verde-scenario-17163549/) by Ash Haghighi.
* [City intersection](https://www.pexels.com/it-it/foto/citta-incrocio-strada-segno-5466436/) by Mathias Reding.
* [Urban scenery](https://www.pexels.com/it-it/foto/auto-strada-alberi-urbano-23132339/) by William Gevorg Urban.
* [Summer at the beach](https://www.pexels.com/it-it/foto/estate-al-mare-28134049/) by Silvia Toni.
* [Mountain landscape](https://www.pexels.com/it-it/foto/paesaggio-montagne-natura-blu-27099860/) by Yves Schelpe.
