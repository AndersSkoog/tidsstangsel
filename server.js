//import helmet from "helmet";
const express = require('express');
const multer = require('multer');
const https = require('https')
const cors = require('cors');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
const pageDir = path.join(__dirname, 'page');
const streamDir = path.join(__dirname, 'stream');
const uploadDir = path.join(__dirname, 'uploads');
const admin_allowedIps = ['77.218.225.119'];
const upload = multer({ dest: uploadDir });
const MAPTILER_API_KEY = "k3AhdT7RvAWsbNcwB1N2";

app.use((req, res, next) => {
    // Clone request headers to modify them
    //req.setHeader('Sec-Fetch-Mode', 'cors');
    //req.setHeader('Sec-Fetch-Site', 'cross-site');

    // Log request headers
    //console.log('Request Headers:', headers); // Logging the modified headers
    var hn = req.protocol + '://' + req.hostname;
    console.log("Login hostname:", hn);

    // Setting security and CORS headers in the response
    //res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Referrer-Policy', 'same-origin');
    // Set the modified headers in the response (if needed)
    //res.setHeader('Sec-Fetch-Mode', 'cors');
    //res.setHeader('Sec-Fetch-Site', 'cross-site');

    // Listen for the response to log response headers
    res.on('finish', () => {
        console.log('Response Headers:', res.getHeaders());
    });

    next(); // Proceed to the next middleware or route handler
});



const start_stream = (inpath) => {
    const ffmpegProcess = spawn('ffmpeg', [
        '-re',
        '-stream_loop', '-1',
        '-i',inpath,                            
        '-f', 'hls',                      
        '-hls_time', '3',                
        '-hls_list_size', '2',            
        '-hls_flags', 'single_file',  
        path.join(streamDir, 'stream.m3u8')
      ]);
    ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
    });
    
    ffmpegProcess.on('error', (err) => {
      console.error(`Failed to start FFmpeg: ${err.message}`);
    });
} 

const ipCheck = (req, res, next) => {
    const clientIp = req.ip; // Get the client's IP address

    // Log the incoming IP for debugging
    console.log('Incoming IP:', clientIp);

    // Check if the client's IP is in the allowed list
    if (admin_allowedIps.includes(clientIp)) {
        return next(); // IP is allowed, proceed to the next middleware/route
    } else {
        return res.status(404).send('Not found');
    }
};


const limiter = rateLimit({
	windowMs: 30 * 60 * 1000, // 15 minutes
	limit: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: false, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/static', express.static(path.join(__dirname, 'static')))

app.get('/tidsstangsel', (req, res)=> {
    res.sendFile('tidsstangsel.html',{root:pageDir});

});

app.get('/test', (req, res)=> {
    res.sendFile('tidsstangseltest.html',{root:pageDir});
});

app.get('/staticmap',(req, res)=> {
    res.sendFile('staticmaptest.html',{root:pageDir});
});

app.get('/stream/:file', (req, res) => {
    const fileName = req.params.file;  // Get the file name from the URL
    res.sendFile(fileName,{root:streamDir,cacheControl:false});
});

app.get('/map/positional', async (req, res) => {
    try {
      // Define the parameters for your static map
      const longitude = req.query.lon || '-74.0060'; // Default to New York City
      const latitude = req.query.lat || '40.7128';
      const zoom = req.query.zoom || 10;
      const width = req.query.width || 600;
      const height = req.query.height || 400;
  
      // Build the MapTiler Static Map API URL
      const mapUrl = `https://api.maptiler.com/maps/basic/static/${longitude},${latitude},${zoom}/${width}x${height}.png?key=${MAPTILER_API_KEY}`;
  
      await axios.get(mapUrl, { responseType: 'arraybuffer' })
      .then(function (response) {
        res.set('Content-Type', 'image/png');
        res.send(response.data)})
      .catch(function (error) {console.log(error);})
    } catch (error) {
      res.status(500).send('Error generating static map');
    }
  });

  app.get('/map/bounding', async (req, res) => {
    try {
      // Define the parameters for your static map
      const minx = req.query.minx || '-74.0060'; // Default to New York City
      const miny = req.query.miny || '40.7128';
      const maxx = req.query.maxx || 10;
      const maxy = req.query.maxy || 10;
      const width = req.query.width || 500;
      const height = req.query.height || 500;
  
      // Build the MapTiler Static Map API URL
      //https://api.maptiler.com/maps/{mapId}/static/{minx},{miny},{maxx},{maxy}/{width}x{height}{scale}.{format}
      const mapUrl = `https://api.maptiler.com/maps/streets/static/${minx},${miny},${maxx},${maxy}/${width}x${height}.png?key=${MAPTILER_API_KEY}`;
  
      // Fetch the static map image from MapTiler
      await axios.get(mapUrl, { responseType: 'arraybuffer' })
      .then(function (response) {
        res.set('Content-Type', 'image/png');
        res.send(response.data)})
      .catch(function (error) {console.log(error);})
    } catch (error) {
        res.status(500).send('Error generating static map');
    }
  });


app.get('/streaminit',ipCheck,limiter, (req, res)=> {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Upload</title>
        </head>
        <body>
            <h1>Upload a File</h1>
            <form action="/streaminit" method="POST" enctype="multipart/form-data">
                <input type="file" name="file" accept=".mp3">
                <button type="submit">Upload</button>
            </form>
        </body>
        </html>`);
});

app.post('/streaminit',ipCheck, limiter, upload.single('file'), (req, res)=> {
    var fileName = req.file.originalname + ".mp3";
    var inpath = path.join(uploadDir,fileName);
    start_stream(inpath);
    res.send("success!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
