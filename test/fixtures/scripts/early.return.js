function test(foo = "foo") {
  return {bar};
  
  function bar() {
    console.log("test");
  }
}

test().bar();