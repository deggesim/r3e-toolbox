import type { Database, ProcessedDatabase } from '../types';
import { fitLinear, fitParabola, computeTime } from './fitting';

const CFG = {
  fitAll: false,
  testMinAIdiffs: 2,
  testMaxTimePct: 0.1,
  testMaxFailsPct: 0.1,
};

function trackGenerator(_classid: string, _trackid: string, track: any): ((t: number) => number) | undefined {
  if (!track.maxAI || (track.maxAI - track.minAI < CFG.testMinAIdiffs)) return undefined;

  const x: number[] = [];
  const y: number[] = [];

  if (CFG.fitAll) {
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const times = track.ailevels[i] || [];
      for (const time of times) {
        x.push(i);
        y.push(time);
      }
    }
  } else {
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const { num, avg: time } = computeTime(track.ailevels[i] || []);
      if (num > 0) {
        x.push(i);
        y.push(time);
      }
    }
  }

  const { a, b } = fitLinear(x, y);
  const c = 0;

  const generator = (t: number) => a + b * t + (c || 0) * (t * t);

  const { avg: minTime } = computeTime(track.ailevels[track.minAI] || []);
  const threshold = minTime * CFG.testMaxTimePct;

  let tested = 0;
  let passed = 0;

  if (CFG.fitAll) {
    let lasttime: number | undefined;
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const base = generator(i);
      const { num, avg: time } = computeTime(track.ailevels[i] || []);
      if (num > 0) {
        tested++;
        const diff = Math.abs(base - time);
        if (diff < threshold) {
          passed++;
        }
      }
      if (base > (lasttime || base)) {
        return undefined; // not monotonically decreasing
      }
      lasttime = base;
    }
  } else {
    let lasttime: number | undefined;
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const base = generator(i);
      const times = track.ailevels[i] || [];
      for (const time of times) {
        tested++;
        const diff = Math.abs(base - time);
        if (diff < threshold) {
          passed++;
        }
      }
      if (base > (lasttime || base)) {
        return undefined; // not monotonically decreasing
      }
      lasttime = base;
    }
  }

  const accepted = tested - passed <= Math.max(1, tested * CFG.testMaxFailsPct);
  return accepted ? generator : undefined;
}

export function processDatabase(database: Database): ProcessedDatabase {
  const filtered: ProcessedDatabase = { classes: {} };

  for (const [classid, classData] of Object.entries(database.classes)) {
    for (const [trackid, track] of Object.entries(classData.tracks)) {
      const gen = trackGenerator(classid, trackid, track);
      if (gen) {
        const classf = filtered.classes[classid] || { tracks: {} };
        filtered.classes[classid] = classf;

        classf.minAI = 80;
        classf.maxAI = 120;

        const ailevels: Record<number, number[]> = {};
        for (let i = 80; i <= 120; i++) {
          ailevels[i] = [parseFloat(gen(i).toFixed(2))];
        }

        const trackf = {
          minAI: 80,
          maxAI: 120,
          ailevels,
        };
        classf.tracks[trackid] = trackf;
      }
    }
  }

  return filtered;
}