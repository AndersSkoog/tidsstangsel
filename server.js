//import helmet from "helmet";
const express = require('express');
const multer = require('multer');
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
    console.log('Request Headers:', headers); // Logging the modified headers
    var hn = req.protocol + '://' + req.hostname;
    console.log("Login hostname:", hn);

    // Setting security and CORS headers in the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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

//sapp.use('/tiles', express.static(path.join(__dirname, 'tiles')));

/*
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: *.tile.openstreetmap.org; script-src 'self'; style-src 'self'");
    next();
});
*/
/*
const osmProxy = createProxyMiddleware({
    target: 'https://tile.openstreetmap.org', // Base URL of the tile server
    changeOrigin: true,
    pathRewrite: {
        '^/osm': '', // Strip the /osm prefix from the path
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send("Internal server error");
    }
});
*/


//app.use(helmet());
app.use('/static', express.static(path.join(__dirname, 'static')));
/*
app.use('/osm', osmProxy, (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    console.log(`Requesting tile: z=${req.params.z}, x=${req.params.x}, y=${req.params.y}`);
    next(); 
});

app.get('/osm/*', (req, res) => {
    const url = req.url.replace('/osm/', 'https://tile.openstreetmap.org/');
    req.pipe(request(url)).pipe(res);
});
*/

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


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
