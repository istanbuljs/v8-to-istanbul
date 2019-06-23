/// <reference types="node" />

import { Profiler } from 'inspector'
import { CoverageMapData } from 'istanbul-lib-coverage'

declare class V8ToIstanbul {
  load(): Promise<void>
  applyCoverage(blocks: ReadonlyArray<Profiler.FunctionCoverage>): void
  toIstanbul(): CoverageMapData
}

declare function v8ToIstanbul(scriptPath: string, wrapperLength?: number): V8ToIstanbul

export = v8ToIstanbul
