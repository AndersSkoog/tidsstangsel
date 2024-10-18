const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
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


app.use(cors({
    origin: '*',
    methods: ['GET']
}));

//sapp.use('/tiles', express.static(path.join(__dirname, 'tiles')));

/*
app.use((req, res, next) => {

    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: *.tile.openstreetmap.org; script-src 'self'; style-src 'self'");
    next();
});
*/

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/tidsstangsel', (req, res)=> {
    res.sendFile('tidsstangsel.html',{root:pageDir});
});

app.get('/test', (req, res)=> {
    res.sendFile('tidsstangseltest.html',{root:pageDir});
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

"ffmpeg -re -stream_loop -1 -i tidsstangsel.mp3 -f hls -hls_time 3 -hls_list_size 2 -hls_flags delete_segments -strftime 1 -hls_segment_filename 'tidsstangsel-%Y%m%d-%s.ts' /srv/site/stream/tidsstangsel.m3u8 &"
