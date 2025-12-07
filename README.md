# Local FFMPEG Server

Locally running server to run [ffmpeg](https://www.ffmpeg.org/) commands local instead of in-browser, \
using [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)
and [ffprobe-static](https://www.npmjs.com/package/ffprobe-static),
so it's faster.

Currently supported ffmpeg features:
* Convert/Transcode
* Split
* Split a single video file into ts files suitable for [HLS](https://en.wikipedia.org/wiki/HTTP_Live_Streaming)
* Concat [HLS](https://en.wikipedia.org/wiki/HTTP_Live_Streaming) ts files into a single mp4 file
* Extract a part of a video
* Extract Video
* Extract Audio
* Scale
* Transpose (flipping and mirroring)
* Modify FPS
* Cropping
* Add Watermark

## Install

### OS Release
You can use the release for your OS, which is an archive, bundling source code,
node.js and static linked ffmpeg binaries. \
The benefit is, you don't need to install node.js, since it's bundled.

* Go to
  [GitHub Release Page](https://github.com/johanna-herrmann/local-ffmpeg-server/releases/latest)
  and select the archive file for your OS
* Unpack the archive
* Optional: Add `local-ffmpeg-server` directory to `PATH` runtime variable

### Node.js via npm
For this install method you need to install node.js first.

When node.js is installed,
Install `local-ffmpeg-server` globally via npm:
```shell
npm install -g local-ffmpeg-server
```

## Usage

If using OS Release and skipped last install step
* Go to `local-ffmpeg-server` directory
* prefix `local-ffmpeg-server` with `.\` on Windows or `./` on Linux/Mac in commands


```shell
local-ffmpeg-server <origin> <port>
```

### Arguments
* `origin` (required): list of allowed origins for [CORS](#cors)
* `port` (optional): Port number, to start the server on, default: `3000`

### Examples

Starts server on port `8080` and allows `https://my-app-using-ffmpeg.de` for [CORS](#cors)
```shell
local-ffmpeg-server https://my-app-using-ffmpeg.de 8080
```

Starts server on port `1234` and allows `https://example1.de` and `https://example2.de` for [CORS](#cors)
```shell
local-ffmpeg-server https://example1.de,https://example2.de 1234
```

Starts server on port `3000` (default) and allows all domains for [CORS](#cors) (not recommended)
```shell
local-ffmpeg-server '*'
```

### Notice
The API Documentation won't be allowed for CORS

## API
Start server and visit `http://localshost:{port}/docs`

Example: http://localshost:3000/docs

## CORS
Cross-Origin Resource Sharing manages from which origins a web resource can be used.
Normally, when http://exampleA.com tries to access http://exampleB.com, this is not allowed.

The target server can send response headers to allow access for origin servers. \
On of those headers is `Access-Control-Allow-Origin` which decides which origins are allowed.
So if `https://abc.de` has to be allowed, the header must be set to this origin,
so this has to be the value of the `origin` argument.

## Demo
To use the demo frontend, you will need two terminal windows:
* First window:
  * Start the server on port `3000`, allowing `http://localhost:8080` for CORS
* Second window:
  * Run:
    ```shell
    cd ./demo
    npx serve -l 8080
    ```
* Now visit: `http://localhost:8080`

## License
[MIT LICENSE](./LICENSE.md)
