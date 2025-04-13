const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

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
    const imageUrls = messageText.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif)/gi);
    const imageTags = [];

    // Strip image URLs from text
    if (imageUrls) {
      imageUrls.forEach(url => {
        messageText = messageText.replace(url, '').trim();
      });

      // Download and save images
      for (let i = 0; i < Math.min(imageUrls.length, 6); i++) {
        const imageUrl = imageUrls[i];
        const fileName = `image_${Date.now()}_${i + 1}.jpg`;
        const filePath = path.join(__dirname, "public", fileName);
        const webPath = `/${fileName}`;

        const imageStream = await axios({
          url: imageUrl,
          responseType: "stream",
        });

        await new Promise((resolve, reject) => {
          imageStream.data.pipe(fs.createWriteStream(filePath))
            .on("finish", resolve)
            .on("error", reject);
        });

        imageTags.push(`<img src="${webPath}" alt="Image" style="max-width: 100%; margin-top: 10px;" />`);
      }
    }

    const finalOutput = `${messageText}<br><br>${imageTags.join('<br>')}`;
    res.send({ message: finalOutput });

  } catch (error) {
    console.error("Error in /api/chat:", error.message || error);
    res.status(500).send({ error: "Failed to get AI response" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
