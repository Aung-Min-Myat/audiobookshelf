import fs = require('../../libs/fsExtra')

function getPlaylistStr(segmentName: string, duration: number, segmentLength: number, hlsSegmentType: string): string {
  var ext = hlsSegmentType === 'fmp4' ? 'm4s' : 'ts'

  var lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-ALLOW-CACHE:NO',
    '#EXT-X-TARGETDURATION:6',
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD'
  ]
  if (hlsSegmentType === 'fmp4') {
    lines.push('#EXT-X-MAP:URI="init.mp4"')
  }
  var numSegments = Math.floor(duration / segmentLength)
  var lastSegment = duration - (numSegments * segmentLength)
  for (let i = 0; i < numSegments; i++) {
    lines.push(`#EXTINF:6,`)
    lines.push(`${segmentName}-${i}.${ext}`)
  }
  if (lastSegment > 0) {
    lines.push(`#EXTINF:${lastSegment},`)
    lines.push(`${segmentName}-${numSegments}.${ext}`)
  }
  lines.push('#EXT-X-ENDLIST')
  return lines.join('\n')
}

function generatePlaylist(outputPath: string, segmentName: string, duration: number, segmentLength: number, hlsSegmentType: string): Promise<void> {
  var playlistStr = getPlaylistStr(segmentName, duration, segmentLength, hlsSegmentType)
  // libs/fsExtra/fs adds the promisified fs methods in a loop (exports[method] = u(fs[method])), so its inferred type has no writeFile
  return (fs as typeof fs & { writeFile(file: string, data: string): Promise<void> }).writeFile(outputPath, playlistStr)
}
export = generatePlaylist