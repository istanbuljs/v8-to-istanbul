function uncoveredFunction() {
  return "Hello world";
}

if ("Branches here" === false) {
  uncoveredFunction();
}
