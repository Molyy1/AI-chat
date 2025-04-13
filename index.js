const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// API route to handle AI chat requests
app.get("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.status(400).send({ error: "Prompt is required" });
    }

    const cacheBuster = Date.now();
    const response = await axios.get(
      `https://yau-ai-runing-station.vercel.app/ai?prompt=${encodeURIComponent(prompt)}&cb=${cacheBuster}`
    );

    if (response.status !== 200 || !response.data || !response.data.response) {
      throw new Error("Failed to get a response from AI");
    }

    let messageText = response.data.response;
    const urls = messageText.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif)/gi);
    const imagePaths = [];

    // Remove image links from messageText and download them
    if (urls && urls.length > 0) {
      urls.forEach((url) => {
        messageText = messageText.replace(url, '').trim();
      });

      for (let i = 0; i < urls.length && i < 6; i++) {
        const imageUrl = urls[i];
        const imageFileName = `image_${Date.now()}_${i + 1}.jpg`;
        const imagePath = path.join(__dirname, "public", imageFileName);
        imagePaths.push(`/${imageFileName}`);

        const imageResponse = await axios({
          url: imageUrl,
          responseType: 'stream',
        });

        await new Promise((resolve, reject) => {
          imageResponse.data.pipe(fs.createWriteStream(imagePath))
            .on('finish', resolve)
            .on('error', reject);
        });
      }
    }

    // Return the cleaned text and image filenames (not URLs)
    res.send({
      message: messageText,
      images: imagePaths, // used by frontend to render images
    });

  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).send({ error: "Failed to get AI response" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
