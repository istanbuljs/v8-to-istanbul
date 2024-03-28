function sum(a, b) {
  if(a === 2 && b === 2) {
    return 4;
  }

  /* v8 ignore start */ // Line 6
  if (a === '10') {
    return add(a, b)
  }
  /* v8 ignore stop */ // Line 10

  return a + b;
};
