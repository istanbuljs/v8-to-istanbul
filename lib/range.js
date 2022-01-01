/**
 * ...something resembling a binary search, to find the lowest line within the range.
 * And then you could break as soon as the line is longer than the range...
 */
module.exports.sliceRange = (lines, startCol, endCol) => {
  let lower = 0
  let upper = lines.length - 1

  let s
  while (lower <= upper) {
    s = (lower + upper) >> 1
    if (startCol < lines[s].startCol) {
      upper = s - 1
    } else if (startCol >= lines[s].endCol) {
      lower = s + 1
    } else {
      let e = s + 1
      while (e < lines.length && endCol > lines[e].startCol) {
        ++e
      }
      return lines.slice(s, e)
    }
  }
  if (s >= 0 && lines[s].startCol >= startCol) {
    let e = s + 1
    while (e < lines.length && endCol > lines[e].startCol) {
      ++e
    }
    return lines.slice(s, e)
  }
  return []
}
