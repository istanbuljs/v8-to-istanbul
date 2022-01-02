/**
 * ...something resembling a binary search, to find the lowest line within the range.
 * And then you could break as soon as the line is longer than the range...
 */
module.exports.sliceRange = (lines, startCol, endCol) => {
  let start = 0
  let end = lines.length - 1

  while (start < end) {
    const mid = (start + end) >> 1
    if (lines[mid].startCol <= startCol && lines[mid].endCol > startCol) {
      start = mid
      end = start
    } else if (lines[mid].startCol > startCol) {
      end = mid - 1
    } else {
      start = mid + 1
    }
  }
  if (start === end) {
    while (end < lines.length && startCol < lines[end].endCol && endCol >= lines[end].startCol) {
      ++end
    }
    return lines.slice(start, end)
  } else {
    return []
  }
}

/**
 * I consider this a temporary solution until I find an alternaive way to fix the "off by one issue"
 */
module.exports.sliceRangeAlt = (lines, startCol, endCol) => {
  let start = 0
  let end = lines.length - 1

  while (start < end) {
    const mid = (start + end) >> 1
    if (lines[mid].startCol <= startCol && lines[mid].endCol >= startCol) {
      start = mid
      end = start
    } else if (lines[mid].startCol > startCol) {
      end = mid - 1
    } else {
      start = mid + 1
    }
  }
  if (start === end) {
    while (end < lines.length && startCol <= lines[end].endCol && endCol >= lines[end].startCol) {
      ++end
    }
    return lines.slice(start, end)
  } else {
    return []
  }
}
