# Image Analysis Hub

A browser-based digital image processing project inspired by the Gonzalez textbook.

# Video Presentation 
Link : https://drive.google.com/file/d/1QjE_lHdibhtbqBhrt7U239ArwVJEh9xT/view?usp=drive_link

## Included modules

- Color processing: RGB to HSI, HSI to RGB, hue rotation, saturation enhancement
- Enhancement: grayscale, negative, contrast stretching, gamma correction, histogram equalization
- Spatial filtering: mean, Gaussian, median, Laplacian sharpening, Sobel edge detection
- Frequency-domain exploration: DFT magnitude, ideal lowpass and highpass filtering, periodic-noise suppression demo
- Morphology: thresholding, erosion, dilation, opening, closing, boundary extraction
- Segmentation: Otsu thresholding, K-means color segmentation, HSI color masking
- Transform coding demos: Haar analysis and Haar-based compression
- Feature extraction and analytics: histogram, Fourier magnitude, edge density, entropy, dominant hue
- AI helper: method recommendation panel and an explainable classifier-style report

## Important note about the classifier

The `CNN-Style Classification` panel is an educational browser heuristic based on extracted features.
It is designed to make the project more advanced and interactive, but it is **not** a trained deep learning model.

## Run

Open `index.html` directly in a browser.

## Files

- `index.html`: project structure
- `styles.css`: interface design
- `app.js`: image-processing logic, advanced transforms, and AI helper behavior
