var cov_1myqaytex8=function(){var path="./test/fixtures/scripts/branches.js";var hash="05fd1c5758177cf8534c86e9665d000812274ffa";var global=new Function("return this")();var gcv="__coverage__";var coverageData={path:"./test/fixtures/scripts/branches.js",statementMap:{"0":{start:{line:2,column:10},end:{line:2,column:18}},"1":{start:{line:5,column:10},end:{line:5,column:37}},"2":{start:{line:8,column:10},end:{line:8,column:31}},"3":{start:{line:11,column:0},end:{line:16,column:3}},"4":{start:{line:12,column:12},end:{line:12,column:14}},"5":{start:{line:15,column:4},end:{line:15,column:25}},"6":{start:{line:20,column:2},end:{line:24,column:3}},"7":{start:{line:21,column:4},end:{line:21,column:23}},"8":{start:{line:23,column:14},end:{line:23,column:16}},"9":{start:{line:27,column:0},end:{line:27,column:3}},"10":{start:{line:30,column:10},end:{line:31,column:10}}},fnMap:{"0":{name:"e",decl:{start:{line:19,column:9},end:{line:19,column:10}},loc:{start:{line:19,column:14},end:{line:25,column:1}},line:19}},branchMap:{"0":{loc:{start:{line:2,column:10},end:{line:2,column:18}},type:"binary-expr",locations:[{start:{line:2,column:10},end:{line:2,column:12}},{start:{line:2,column:16},end:{line:2,column:18}}],line:2},"1":{loc:{start:{line:5,column:10},end:{line:5,column:37}},type:"cond-expr",locations:[{start:{line:5,column:18},end:{line:5,column:25}},{start:{line:5,column:28},end:{line:5,column:37}}],line:5},"2":{loc:{start:{line:8,column:10},end:{line:8,column:31}},type:"binary-expr",locations:[{start:{line:8,column:10},end:{line:8,column:11}},{start:{line:8,column:15},end:{line:8,column:16}},{start:{line:8,column:20},end:{line:8,column:25}},{start:{line:8,column:29},end:{line:8,column:31}}],line:8},"3":{loc:{start:{line:11,column:0},end:{line:16,column:3}},type:"if",locations:[{start:{line:11,column:0},end:{line:16,column:3}},{start:{line:11,column:0},end:{line:16,column:3}}],line:11},"4":{loc:{start:{line:20,column:2},end:{line:24,column:3}},type:"if",locations:[{start:{line:20,column:2},end:{line:24,column:3}},{start:{line:20,column:2},end:{line:24,column:3}}],line:20},"5":{loc:{start:{line:30,column:10},end:{line:31,column:10}},type:"binary-expr",locations:[{start:{line:30,column:10},end:{line:30,column:12}},{start:{line:31,column:2},end:{line:31,column:4}},{start:{line:31,column:8},end:{line:31,column:10}}],line:30}},s:{"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0},f:{"0":0},b:{"0":[0,0],"1":[0,0],"2":[0,0,0,0],"3":[0,0],"4":[0,0],"5":[0,0,0]},_coverageSchema:"43e27e138ebf9cfc5966b082cf9a028302ed4184",hash:"05fd1c5758177cf8534c86e9665d000812274ffa"};var coverage=global[gcv]||(global[gcv]={});if(coverage[path]&&coverage[path].hash===hash){return coverage[path];}return coverage[path]=coverageData;}();// basic binary operation.
const a=(cov_1myqaytex8.s[0]++,(cov_1myqaytex8.b[0][0]++,99)||(cov_1myqaytex8.b[0][1]++,33));// basic conditional operation.
const b=(cov_1myqaytex8.s[1]++,false?(cov_1myqaytex8.b[1][0]++,'hello'):(cov_1myqaytex8.b[1][1]++,'goodbye'));// nary operation.
const c=(cov_1myqaytex8.s[2]++,(cov_1myqaytex8.b[2][0]++,a)&&(cov_1myqaytex8.b[2][1]++,b)&&(cov_1myqaytex8.b[2][2]++,false)&&(cov_1myqaytex8.b[2][3]++,33));// if statement.
cov_1myqaytex8.s[3]++;if(false){cov_1myqaytex8.b[3][0]++;const d=(cov_1myqaytex8.s[4]++,99);}else{cov_1myqaytex8.b[3][1]++;cov_1myqaytex8.s[5]++;console.info('hello');}// if statement in function.
function e(){cov_1myqaytex8.f[0]++;cov_1myqaytex8.s[6]++;if(true){cov_1myqaytex8.b[4][0]++;cov_1myqaytex8.s[7]++;console.info('hey');}else{cov_1myqaytex8.b[4][1]++;const f=(cov_1myqaytex8.s[8]++,99);}}cov_1myqaytex8.s[9]++;e();// binary operation that spans multiple lines.
const g=(cov_1myqaytex8.s[10]++,(cov_1myqaytex8.b[5][0]++,99)&&(cov_1myqaytex8.b[5][1]++,33)||(cov_1myqaytex8.b[5][2]++,13));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvYmVuY29lL29zcy92OC10by1pc3RhbmJ1bC90ZXN0L2ZpeHR1cmVzL3NjcmlwdHMvYnJhbmNoZXMuanMiXSwibmFtZXMiOlsiYSIsImIiLCJjIiwiZCIsImNvbnNvbGUiLCJpbmZvIiwiZSIsImYiLCJnIl0sIm1hcHBpbmdzIjoieXlGQUFBO0FBQ0EsS0FBTUEsQ0FBQUEsQ0FBQyx3QkFBRyx5REFBTSxFQUFOLENBQUgsQ0FBUCxDQUVBO0FBQ0EsS0FBTUMsQ0FBQUEsQ0FBQyx3QkFBRyxnQ0FBUSxPQUFSLDRCQUFrQixTQUFsQixDQUFILENBQVAsQ0FFQTtBQUNBLEtBQU1DLENBQUFBLENBQUMsd0JBQUcsMEJBQUFGLENBQUMsNkJBQUlDLENBQUosQ0FBRCw0QkFBVSxLQUFWLDZCQUFtQixFQUFuQixDQUFILENBQVAsQ0FFQTtzQkFDQSxHQUFJLEtBQUosQ0FBVywwQkFDVCxLQUFNRSxDQUFBQSxDQUFDLHdCQUFHLEVBQUgsQ0FBUCxDQUNELENBRkQsSUFHTyxnREFDSEMsT0FBTyxDQUFDQyxJQUFSLENBQWEsT0FBYixFQUNELENBRUg7QUFDQSxRQUFTQyxDQUFBQSxDQUFULEVBQWMsNkNBQ1osR0FBSSxJQUFKLENBQVUsZ0RBQ1JGLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLEtBQWIsRUFDRCxDQUZELElBRU8sMEJBQ0wsS0FBTUUsQ0FBQUEsQ0FBQyx3QkFBRyxFQUFILENBQVAsQ0FDRCxDQUNGLEMsc0JBRURELENBQUMsR0FFRDtBQUNBLEtBQU1FLENBQUFBLENBQUMseUJBQUcseURBQ1IsRUFEUSw2QkFDRixFQURFLENBQUgsQ0FBUCIsInNvdXJjZXNDb250ZW50IjpbIi8vIGJhc2ljIGJpbmFyeSBvcGVyYXRpb24uXG5jb25zdCBhID0gOTkgfHwgMzNcblxuLy8gYmFzaWMgY29uZGl0aW9uYWwgb3BlcmF0aW9uLlxuY29uc3QgYiA9IGZhbHNlID8gJ2hlbGxvJyA6ICdnb29kYnllJ1xuXG4vLyBuYXJ5IG9wZXJhdGlvbi5cbmNvbnN0IGMgPSBhICYmIGIgJiYgZmFsc2UgJiYgMzNcblxuLy8gaWYgc3RhdGVtZW50LlxuaWYgKGZhbHNlKSB7XG4gIGNvbnN0IGQgPSA5OVxufVxuICBlbHNlIHtcbiAgICBjb25zb2xlLmluZm8oJ2hlbGxvJylcbiAgfVxuXG4vLyBpZiBzdGF0ZW1lbnQgaW4gZnVuY3Rpb24uXG5mdW5jdGlvbiBlICgpIHtcbiAgaWYgKHRydWUpIHtcbiAgICBjb25zb2xlLmluZm8oJ2hleScpXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZiA9IDk5XG4gIH1cbn1cblxuZSgpXG5cbi8vIGJpbmFyeSBvcGVyYXRpb24gdGhhdCBzcGFucyBtdWx0aXBsZSBsaW5lcy5cbmNvbnN0IGcgPSA5OSAmJlxuICAzMyB8fCAxM1xuIl19
