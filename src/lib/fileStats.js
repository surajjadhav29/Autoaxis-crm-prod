export function isHoldFile(f) {
  return f.status === 'on_hold';
}

export function computeFileStats(files) {
  return {
    totalFiles: files.length,
    pendingFiles: files.filter((f) => f.status === 'pending').length,
    inProgressFiles: files.filter((f) => f.status === 'in_progress').length,
    completedFiles: files.filter((f) => ['completed', 'done'].includes(f.status)).length,
    objectionFiles: files.filter((f) => f.status === 'objection').length,
    holdSheet: files.filter((f) => f.status === 'on_hold').length,
    returnPaper: files.filter((f) => f.status === 'paper_return').length,
    onHoldManual: files.filter((f) => f.status === 'on_hold').length,
    countAll: files.filter((f) => ['pending', 'in_progress'].includes(f.status)).length,
    countHold: files.filter((f) => isHoldFile(f)).length,
    countReturn: files.filter((f) => f.status === 'paper_return').length,
    countObjection: files.filter((f) => f.status === 'objection').length,
  };
}
