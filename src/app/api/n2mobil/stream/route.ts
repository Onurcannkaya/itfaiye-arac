import { NextRequest, NextResponse } from "next/server";
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = request.nextUrl.searchParams.get('url');
    
    if (!url || !url.startsWith('rtsp://')) {
      return new NextResponse('Geçersiz RTSP URL', { status: 400 });
    }

    if (!ffmpegPath) {
      return new NextResponse('FFMPEG kütüphanesi bulunamadı', { status: 500 });
    }

    console.log(`[FFMPEG] Starting stream for: ${url}`);

    // mpjpeg default boundary is "ffserver"
    const boundary = 'ffserver';

    const ffmpeg = spawn(ffmpegPath as string, [
      '-rtsp_transport', 'tcp', // use tcp for stability
      '-i', url,                // input RTSP URL
      '-f', 'mpjpeg',           // format is multi-part jpeg
      '-r', '15',               // framerate 15 fps
      '-q:v', '5',              // quality scale 1-31 (5 is very good)
      '-s', '640x360',          // resize to 360p to save server bandwidth
      '-an',                    // no audio
      '-'                       // output to stdout
    ]);

    const stream = new ReadableStream({
      start(controller) {
        ffmpeg.stdout.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        ffmpeg.stderr.on('data', (data) => {
          // Uncomment for debugging ffmpeg issues
          // console.log('[FFMPEG STDERR]', data.toString());
        });

        ffmpeg.on('close', (code) => {
          console.log(`[FFMPEG] Process closed with code ${code}`);
          try { controller.close(); } catch (e) {}
        });
        
        ffmpeg.on('error', (err) => {
          console.error('[FFMPEG] Error:', err);
          try { controller.error(err); } catch (e) {}
        });
      },
      cancel() {
        console.log('[FFMPEG] Client disconnected, killing process...');
        ffmpeg.kill('SIGKILL');
      }
    });

    const headers = new Headers();
    headers.set('Content-Type', `multipart/x-mixed-replace;boundary=${boundary}`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Connection', 'close');

    // Next.js handles signal abortion on streaming responses natively via ReadableStream.cancel()
    return new Response(stream, { headers });
  } catch (err) {
    console.error('[FFMPEG] Stream Route Error:', err);
    return new NextResponse('Sunucu Hatası', { status: 500 });
  }
}
