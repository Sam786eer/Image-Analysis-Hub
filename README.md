# Image Analysis Hub

A browser-based digital image processing website built to demonstrate major image processing concepts through interactive visual experiments.

## Video Presentation

Link: [Google Drive Presentation Video](https://drive.google.com/file/d/1QjE_lHdibhtbqBhrt7U239ArwVJEh9xT/view?usp=drive_link)

## Live website

After GitHub Pages deploys, the project will be available at:

[https://sam786eer.github.io/Image-Analysis-Hub/](https://sam786eer.github.io/Image-Analysis-Hub/)

## Preview

You can add homepage and feature screenshots here later for stronger GitHub presentation, for example:

- Homepage view
- Color processing page
- Segmentation page
- Frequency analysis page

## Project overview

Image Analysis Hub is designed as an educational, presentation-friendly, and practical image processing platform.
Users upload an image once, move between dedicated pages, and apply different classes of image processing methods without re-uploading the image.

## Main features

- Multi-page website structure with dedicated routes for Overview, Color, Enhancement, Filtering, Frequency Analysis, Morphology, Segmentation, Transforms, and AI Analysis
- Persistent uploaded image across all pages
- RGB to HSI and HSI to RGB conversion
- RGB to CMYK and CMYK to RGB conversion
- Image enhancement using grayscale conversion, negative transformation, contrast stretching, gamma correction, and histogram equalization
- Spatial filtering using mean, Gaussian, median, Laplacian, and Sobel operations
- Frequency-domain exploration using DFT magnitude spectrum, ideal lowpass filtering, ideal highpass filtering, and periodic-noise suppression demo
- Morphological processing using thresholding, erosion, dilation, opening, and closing
- Segmentation using Otsu thresholding, K-means segmentation, HSI color masking, and morphological boundary mapping
- Transform and compression demonstrations using Haar analysis and Haar compression
- Feature extraction and analytics with histogram view, Fourier magnitude panel, and feature snapshot
- AI helper tools including workflow advisor, classifier-style report, and quality analysis

## Tech stack

- HTML
- CSS
- Vanilla JavaScript
- Canvas API
- Node.js local server for localhost routing
- GitHub Pages for static deployment

## Local run

Open the project locally with:

```powershell
C:\Users\mohsa\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe server.js
```

Then visit:

[http://localhost:4174/](http://localhost:4174/)

## Repository structure

- `index.html` - website structure
- `styles.css` - full UI styling
- `app.js` - image processing logic, routing, persistence, and AI helper behavior
- `server.js` - local route-aware server for localhost development

## Important note

The AI classification section is an educational browser heuristic, not a trained deep learning model. It is included to make the project more interactive and presentation-ready while leaving scope for future deep learning integration.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow that deploys the website to GitHub Pages automatically when changes are pushed to `main`.
