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

app.use((req, res, next) => {
    // Clone request headers to modify them
    //req.setHeader('Sec-Fetch-Mode', 'cors');
    //req.setHeader('Sec-Fetch-Site', 'cross-site');

    // Log request headers
    //console.log('Request Headers:', headers); // Logging the modified headers
    var hn = req.protocol + '://' + req.hostname;
    console.log("Login hostname:", hn);

    // Setting security and CORS headers in the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Referrer-Policy', 'no-referrer');
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


app.get('/tidsstangsel', (req, res)=> {
    res.sendFile('tidsstangsel.html',{root:pageDir});

});

app.get('/test', (req, res)=> {
    res.sendFile('tidsstangseltest.html',{root:pageDir});
});

app.get('/test2', (req, res)=> {
    res.sendFile('maptiler_test.html',{root:pageDir});
});

app.get('/leaf', (req, res)=> {
    res.sendFile('leaflet_test.html',{root:pageDir});
});


app.get('/stream/:file', (req, res) => {
    const fileName = req.params.file;  // Get the file name from the URL
    res.sendFile(fileName,{root:streamDir,cacheControl:false});
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

const maptiler_apikey = 'UlZm4aEVd5R6TdbUgwrH';
const TILE_SERVER_HOST = 'https://api.maptiler.com';
///maps/topo/{z}/{x}/{y}.png?key='+apikey; 
const osmProxy = createProxyMiddleware({
    target: TILE_SERVER_HOST, // Set the base URL for the proxy
    changeOrigin: true,
    pathRewrite: {
        '^/tiles': '/maps/topo', // Rewrite the path to the correct format for MapTiler
    },
    onProxyReq: (proxyReq, req, res) => {
        // Add the API key as a query parameter to the proxied request
        const apiKeyParam = `?key=${maptiler_apikey}`;
        proxyReq.path += apiKeyParam; // Append the API key to the request path
        console.log(`Proxying request to: ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Internal Server Error while fetching tiles');
    }
});

app.use('/tiles/:z/:x/:y', (req, res, next) => {
    console.log(`Requesting tile: z=${req.params.z}, x=${req.params.x}, y=${req.params.y}`);
    console.log('tile request headers', req.rawHeaders);
    next(); // Pass control to the proxy middleware
}, osmProxy);




app.get('/tiles/:z/:x/:y', (req, res) => {
    const { z, x, y } = req.params;
    console.log("tilereqest_headers,"req.headers);
    const requrl = `${TILE_SERVER_HOST}/maps/topo/${z}/${x}/${y}.png?key=${maptiler_apikey}`;
    const options = {
        hostname: TILE_SERVER_HOST,
        path: `/${z}/${x}/${y}.png?key=${maptiler_apikey}`,
        method: 'GET',
        headers: {
          'Accept': 'image/png,image/*;q=0.8',
          'Connection': 'keep-alive'
        }
    };
      // Log the headers you are sending in the proxied request
    console.log('Proxied request headers:', options.headers);

    // Make the request to OpenStreetMap
    const proxyReq = https.request(options, proxyRes => {
      // Log the response headers from the proxied request
      console.log('Response headers from OSM:', proxyRes.headers);

      // Forward the status code and headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // Stream the response back to the client
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy Request Error:', err);
      res.status(500).send('Error in proxying request');
    });

    proxyReq.end(); // End the request
    /*
    const options = {
        hostname: TILE_SERVER_HOST, // Tile server hostname
        port: 443,                  // HTTPS port
        path: requrl,             // The path to the tile
        method: 'GET',              // HTTP method
        headers: {
            'Accept': 'image/png',
            'Accept-Language': 'sv-SE,sv;q=0.8,en-US;q=0.5,en;q=0.3',
            'User-Agent': '',
        }
    };
    /*

    // Remove the User-Agent header
    delete options.headers['user-agent'];

    // Log the request headers before sending to the tile server
    console.log(`Forwarding request to tile server: ${tilePath}`);
    console.log('Request Headers:', options.headers);

    // Send the request to the tile server
    const proxyReq = https.request(options, (proxyRes) => {
        // Log the response status code and headers from the tile server
        console.log('Tile Server Response Status:', proxyRes.statusCode);
        console.log('Tile Server Response Headers:', proxyRes.headers);

        // Forward the status code and headers from the tile server to the client
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Pipe the data from the tile server back to the client (the actual tile image)
        proxyRes.pipe(res);
    });

    // Handle any errors during the proxy request
    proxyReq.on('error', (e) => {
        console.error(`Problem with proxy request: ${e.message}`);
        res.writeHead(500);
        res.end('Internal Server Error');
    });

    // End the request
    proxyReq.end();
    */
});



















// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
