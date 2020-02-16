class SourceMapScannerIterator {
    constructor(mappings) {
        this.mappings = mappings
        this.index = 0
    }

    _binarySearchStart (startLine, startCol, startIndex, endIndex) {
        if (startIndex === endIndex) {
            return startIndex
        }
        const midPoint = Math.floor((endIndex + startIndex) / 2)
        if (this.isGeneratedAfter(this.mappings[midPoint], startLine, startCol)) {
            // generated point is after point we are looking for, so exclude is (midPoint - 1)
            return this._binarySearchStart(startLine, startCol, 0, Math.max(0, midPoint - 1))
        } else {
            // if we are down to 2 points
            // find 4 in 1 3 5
            // midpoint = 1 -> 3
            // if 3 is after 4 - false
            // 1,2
            // 
            if (endIndex - midPoint === 1) {
                return midPoint
            }
            // generated point is before the point we are looking for, so might be valid, so include it
            return this._binarySearchStart(startLine, startCol, midPoint, endIndex)
        }
    }

    isGeneratedAfter (mapping, line, col) {
        return mapping.generatedLine > line ||
            (mapping.generatedLine === line && mapping.generatedColumn > col)
    }

    scanTo (startLine, startCol) {
        this.index = this._binarySearchStart(startLine, startCol, 0, this.mappings.length - 1)

        // make sure we have the first mapping for this exact position
        while (this.index > 0 &&
            this.mappings[this.index].generatedLine === this.mappings[this.index - 1].generatedLine &&
            this.mappings[this.index].generatedColumn === this.mappings[this.index - 1].generatedColumn) {
            this.index--
        }

        return this.mappings[this.index]
    }

    next () {
        return this.mappings[++this.index]
    }

    peek () {
        return this.mappings[this.index + 1]
    }
}

module.exports = class SourceMapScanner {
    constructor(sourcemap) {
        // [{ source: 'illmatic.js',
        //   generatedLine: 1,
        //   generatedColumn: 0,
        //   originalLine: 1,
        //   originalColumn: 0,
        //   name: null }]
        this.mappings = []
        sourcemap.eachMapping((mapping) => {
            this.mappings.push(mapping)
        })
    }

    getIterator () {
        return new SourceMapScannerIterator(this.mappings)
    }
}
