console.log(__filename);
console.log(__dirname);
function hello(){
    console.log("hello jk!");
}
t=setTimeout(hello,2000);
clearTimeout(t);
t1=setInterval(hello,2000);
clearInterval(t1);