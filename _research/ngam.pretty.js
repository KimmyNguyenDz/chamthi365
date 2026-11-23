function K(t){
const r=t.w*t.h,n=new Uint8Array(r),o=t.d;
for(let a=0,c=0;
a<r;
a++,c+=4)n[a]=o[c]*77+o[c+1]*150+o[c+2]*29>>8;
return{
w:t.w,h:t.h,d:n
}
}function tt(t,r){
const n=Math.max(t.w,t.h)/r;
if(n<=1)return{
anh:t,heSo:1
};
const o=Math.round(t.w/n),a=Math.round(t.h/n),c=new Uint8Array(o*a);
for(let e=0;
e<a;
e++){
const i=Math.floor(e*n),l=Math.min(t.h,Math.max(i+1,Math.floor((e+1)*n)));
for(let u=0;
u<o;
u++){
const f=Math.floor(u*n),p=Math.min(t.w,Math.max(f+1,Math.floor((u+1)*n)));
let x=0;
for(let M=i;
M<l;
M++){
const w=M*t.w;
for(let d=f;
d<p;
d++)x+=t.d[w+d]
}c[e*o+u]=x/((l-i)*(p-f))
}
}return{
anh:{
w:o,h:a,d:c
},heSo:1/n
}
}function nt(t,r=16){
const n=Math.ceil(t.w/r),o=Math.ceil(t.h/r);
let a=new Float32Array(n*o);
const c=new Uint16Array(256);
for(let l=0;
l<o;
l++)for(let u=0;
u<n;
u++){
let f=0;
const p=Math.min(t.h,(l+1)*r),x=Math.min(t.w,(u+1)*r);
c.fill(0);
let M=0;
for(let d=l*r;
d<p;
d+=2)for(let A=u*r+(d&2?1:0);
A<x;
A+=2)c[t.d[d*t.w+A]]++,M++;
let w=0;
for(let d=255;
d>=0;
d--)if(w+=c[d],w>=M*.05){
f=d;
break
}a[l*n+u]=f
}for(let l=0;
l<2;
l++){
const u=new Float32Array(n*o);
for(let f=0;
f<o;
f++)for(let p=0;
p<n;
p++){
let x=0;
for(let M=-1;
M<=1;
M++)for(let w=-1;
w<=1;
w++){
const d=f+M,A=p+w;
d>=0&&d<o&&A>=0&&A<n&&a[d*n+A]>x&&(x=a[d*n+A])
}u[f*n+p]=x
}a=u
}const e=new Float32Array(n*o);
for(let l=0;
l<o;
l++)for(let u=0;
u<n;
u++){
let f=0,p=0;
for(let x=-1;
x<=1;
x++)for(let M=-1;
M<=1;
M++){
const w=l+x,d=u+M;
w>=0&&w<o&&d>=0&&d<n&&(f+=a[w*n+d],p++)
}e[l*n+u]=Math.max(40,f/p)
}const i=new Uint8Array(t.w*t.h);
for(let l=0;
l<t.h;
l++){
const u=Math.min(o-1.001,Math.max(0,l/r-.5)),f=Math.floor(u),p=u-f;
for(let x=0;
x<t.w;
x++){
const M=Math.min(n-1.001,Math.max(0,x/r-.5)),w=Math.floor(M),d=M-w,A=f*n+w,I=(e[A]*(1-d)+e[A+1]*d)*(1-p)+(e[A+n]*(1-d)+e[A+n+1]*d)*p,S=t.d[l*t.w+x]*255/I;
i[l*t.w+x]=S>255?255:S
}
}return{
w:t.w,h:t.h,d:i
}
}function H(t,r,n){
if(r<0||n<0||r>=t.w-1||n>=t.h-1)return 255;
const o=r|0,a=n|0,c=r-o,e=n-a,i=a*t.w+o,l=t.d;
return(l[i]*(1-c)+l[i+1]*c)*(1-e)+(l[i+t.w]*(1-c)+l[i+t.w+1]*c)*e
}const ot=[{
nguong:[105],nenSang:!1
},{
nguong:[135,160],nenSang:!0
}];
function et(t,r){
const n=[];
for(const o of[.95,1.15])for(let a=0;
a<24;
a++){
const c=2*Math.PI*a/24,e=Math.round(r.x+o*r.canh*Math.cos(c)),i=Math.round(r.y+o*r.canh*Math.sin(c));
n.push(e<0||i<0||e>=t.w||i>=t.h?0:t.d[i*t.w+e])
}return n.sort((o,a)=>o-a),n[Math.floor(n.length*.1)]
}function ct(t,r,n=!1){
const o=[];
for(const a of r)for(const c of rt(t,a))o.some(e=>Math.hypot(e.x-c.x,e.y-c.y)<.5*Math.max(e.canh,c.canh))||o.push(c);
return n?o.filter(a=>et(t,a)>=200):o
}function rt(t,r=105){
const{
w:n,h:o,d:a
}=t,c=new Int32Array(n*o),e=[0],i=s=>{
for(;
e[s]!==s;
)e[s]=e[e[s]],s=e[s];
return s
},l=(s,m)=>{
s=i(s),m=i(m),s!==m&&(e[Math.max(s,m)]=Math.min(s,m))
};
let u=1;
for(let s=0;
s<o;
s++){
const m=s*n;
for(let h=0;
h<n;
h++){
if(a[m+h]>=r)continue;
const g=h>0?c[m+h-1]:0,b=s>0?c[m-n+h]:0,k=s>0&&h>0?c[m-n+h-1]:0,T=s>0&&h<n-1?c[m-n+h+1]:0;
let C=g||b||k||T;
if(!C)C=u++,e.push(C);
else for(const G of[g,b,k,T])G&&G!==C&&l(C,G);
c[m+h]=C
}
}const f=u,p=new Int32Array(f),x=new Float64Array(f),M=new Float64Array(f),w=new Int32Array(f).fill(n),d=new Int32Array(f).fill(-1),A=new Int32Array(f).fill(o),I=new Int32Array(f).fill(-1);
for(let s=1;
s<f;
s++)e[s]=i(s);
for(let s=0;
s<o;
s++){
const m=s*n;
for(let h=0;
h<n;
h++){
let g=c[m+h];
g&&(g=e[g],c[m+h]=g,p[g]++,x[g]+=h,M[g]+=s,h<w[g]&&(w[g]=h),h>d[g]&&(d[g]=h),s<A[g]&&(A[g]=s),s>I[g]&&(I[g]=s))
}
}const S=20,U=(Math.min(n,o)/10)**2,y=[];
for(let s=1;
s<f;
s++){
const m=p[s];
if(m<S||m>U)continue;
const h=d[s]-w[s]+1,g=I[s]-A[s]+1;
if(h/g>1.9||g/h>1.9||m/(h*g)<.45)continue;
const b=x[s]/m,k=M[s]/m;
let T=0,C=0,G=0;
const E=new Int32Array(h).fill(1<<30),_=new Int32Array(h).fill(-1);
for(let v=A[s];
v<=I[s];
v++){
let O=1073741824,j=-1;
for(let N=w[s];
N<=d[s];
N++){
if(c[v*n+N]!==s)continue;
const R=(N-b)**2+(v-k)**2;
R>T&&(T=R),N<O&&(O=N),N>j&&(j=N);
const D=N-w[s];
v<E[D]&&(E[D]=v),v>_[D]&&(_[D]=v)
}j>=0&&(C+=j-O+1)
}for(let v=0;
v<h;
v++)_[v]>=0&&(G+=_[v]-E[v]+1);
if(m/C<.9||m/G<.9)continue;
const Q=m/(Math.PI*(Math.sqrt(T)+.5)**2);
Q>.8||y.push({
x:b,y:k,canh:Math.sqrt(m),tron:Q
})
}return y
}function F(t,r,n){
const o=t[6]*r+t[7]*n+t[8];
return[(t[0]*r+t[1]*n+t[2])/o,(t[3]*r+t[4]*n+t[5])/o]
}function at(t,r,n){
const o=t.slice(),a=r.slice();
for(let e=0;
e<n;
e++){
let i=e;
for(let l=e+1;
l<n;
l++)Math.abs(o[l*n+e])>Math.abs(o[i*n+e])&&(i=l);
if(Math.abs(o[i*n+e])<1e-12)return null;
if(i!==e){
for(let u=0;
u<n;
u++){
const f=o[e*n+u];
o[e*n+u]=o[i*n+u],o[i*n+u]=f
}const l=a[e];
a[e]=a[i],a[i]=l
}for(let l=e+1;
l<n;
l++){
const u=o[l*n+e]/o[e*n+e];
if(u!==0){
for(let f=e;
f<n;
f++)o[l*n+f]-=u*o[e*n+f];
a[l]-=u*a[e]
}
}
}const c=new Array(n).fill(0);
for(let e=n-1;
e>=0;
e--){
let i=a[e];
for(let l=e+1;
l<n;
l++)i-=o[e*n+l]*c[l];
c[e]=i/o[e*n+e]
}return c
}function W(t){
let r=0,n=0;
for(const[c,e]of t)r+=c,n+=e;
r/=t.length,n/=t.length;
let o=0;
for(const[c,e]of t)o+=Math.hypot(c-r,e-n);
const a=Math.SQRT2/Math.max(1e-9,o/t.length);
return{
T:[a,0,-a*r,0,a,-a*n,0,0,1],q:t.map(([c,e])=>[a*(c-r),a*(e-n)])
}
}function X(t,r){
const n=new Array(9).fill(0);
for(let o=0;
o<3;
o++)for(let a=0;
a<3;
a++)for(let c=0;
c<3;
c++)n[o*3+a]+=t[o*3+c]*r[c*3+a];
return n
}function lt(t){
const[r,n,o,a,c,e,i,l,u]=t,f=c*u-e*l,p=-(a*u-e*i),x=a*l-c*i,M=r*f+n*p+o*x;
return[f/M,-(n*u-o*l)/M,(n*e-o*c)/M,p/M,(r*u-o*i)/M,-(r*e-o*a)/M,x/M,-(r*l-n*i)/M,(r*c-n*a)/M]
}function z(t,r){
if(t.length<4)return null;
const n=W(t),o=W(r),a=new Array(64).fill(0),c=new Array(8).fill(0),e=(f,p)=>{
for(let x=0;
x<8;
x++){
c[x]+=f[x]*p;
for(let M=0;
M<8;
M++)a[x*8+M]+=f[x]*f[M]
}
};
for(let f=0;
f<n.q.length;
f++){
const[p,x]=n.q[f],[M,w]=o.q[f];
e([p,x,1,0,0,0,-M*p,-M*x],M),e([0,0,0,p,x,1,-w*p,-w*x],w)
}const i=at(a,c,8);
if(!i)return null;
const l=[i[0],i[1],i[2],i[3],i[4],i[5],i[6],i[7],1],u=X(X(lt(o.T),l),n.T);
return u.map(f=>f/u[8])
}function P(t,r,n){
const o=F(t,r,n),a=F(t,r+10,n),c=F(t,r,n+10);
return(Math.hypot(a[0]-o[0],a[1]-o[1])+Math.hypot(c[0]-o[0],c[1]-o[1]))/20
}const st=1024;
function ft(t){
return[...t.sbd.flat(),...t.ma.flat(),...t.p1.flatMap(r=>r.o),...t.p2.flatMap(r=>r.y.flat()),...t.p3.flatMap(r=>r.c.flatMap(n=>[...n.so,...n.tru?[n.tru]:[],...n.phay?[n.phay]:[]]))]
}function ht(t,r,n,o,a,c,e=st){
const i=performance.now(),l={
id:n,ms:0,khop:0,tong:t.moc.length,goc:null,gocMoc:null,gocCanh:null,gocOk:null,moc:[],vuong:[],net:0,van:null,vanTrang:null
},u=tt(K({
w:o,h:a,d:c
}),e),f=nt(u.anh),p=1/u.heSo;
let x=[],M=null;
for(const w of ot){
const d=ct(f,w.nguong,w.nenSang);
if(x.length||(x=d),M=d.length>=4?gt(d,t,f.w*f.h,r,f):null,M){
x=d;
break
}
}l.vuong=x.slice().sort((w,d)=>d.canh-w.canh).slice(0,12).map(w=>[w.x*p,w.y*p]);
try{
if(!M)throw 0;
const{
H:w
}=M,[d,A]=t.trang,I=[[0,0],[d,0],[d,A],[0,A]].map(([y,s])=>{
const m=F(w,y,s);
return[m[0]*p,m[1]*p]
});
if(!ut(I,o,a))throw 0;
l.goc=I,l.khop=M.khop,l.gocMoc=t.goc.map(([y,s])=>{
const m=F(w,y,s);
return[m[0]*p,m[1]*p]
});
const S=t.goc.map(([y,s])=>t.moc.reduce((m,h,g)=>Math.hypot(h[0]-y,h[1]-s)<Math.hypot(t.moc[m][0]-y,t.moc[m][1]-s)?g:m,0));
l.gocCanh=S.map((y,s)=>t.moc[y][2]*P(w,t.goc[s][0],t.goc[s][1])*p),l.gocOk=S.map(y=>M.ok[y]),l.moc=t.moc.map(([y,s,m],h)=>{
const g=F(w,y,s);
return{
p:[g[0]*p,g[1]*p],c:m*P(w,y,s)*p,ok:M.ok[h]
}
});
const U=new Float32Array(r.length);
r.forEach(([y,s],m)=>{
const h=F(w,y,s);
U[m]=1-H(f,h[0],h[1])/255
}),l.van=U,l.vanTrang=it(t,w,f),l.net=pt(f,l.goc.map(([y,s])=>[y/p,s/p]))
}catch{

}return l.ms=performance.now()-i,l
}const B=7;
function it(t,r,n){
const o=t.goc.map(x=>x[0]),a=t.goc.map(x=>x[1]),c=Math.min(...o),e=Math.min(...a),i=Math.max(...o)-c,l=Math.max(...a)-e,u=Math.max(4,Math.round(i/B)),f=Math.max(4,Math.round(l/B)),p=new Float32Array(u*f);
for(let x=0;
x<f;
x++)for(let M=0;
M<u;
M++){
let w=0;
for(const d of[.25,.5,.75])for(const A of[.25,.5,.75]){
const I=F(r,c+(M+A)/u*i,e+(x+d)/f*l);
w+=1-H(n,I[0],I[1])/255
}p[x*u+M]=w/9
}return p
}function ut(t,r,n){
if(t.some(c=>!Number.isFinite(c[0])||!Number.isFinite(c[1])||c[0]<-.5*r||c[0]>1.5*r||c[1]<-.5*n||c[1]>1.5*n))return!1;
let o=0;
for(let c=0;
c<4;
c++){
const e=t[c],i=t[(c+1)%4],l=t[(c+2)%4],u=(i[0]-e[0])*(l[1]-i[1])-(i[1]-e[1])*(l[0]-i[0]),f=Math.sign(u);
if(!f||o&&f!==o)return!1;
o=f
}let a=0;
for(let c=0;
c<4;
c++){
const e=t[c],i=t[(c+1)%4];
a+=e[0]*i[1]-i[0]*e[1]
}return Math.abs(a)/2>.01*r*n
}function V(t){
const r=t.reduce((c,e)=>c+e[0],0)/4,n=t.reduce((c,e)=>c+e[1],0)/4,o=t.slice().sort((c,e)=>Math.atan2(c[1]-n,c[0]-r)-Math.atan2(e[1]-n,e[0]-r));
let a=0;
for(let c=1;
c<4;
c++)o[c][0]+o[c][1]<o[a][0]+o[a][1]&&(a=c);
return o.slice(a).concat(o.slice(0,a))
}function Y(t,r,n){
const o=[],a=[];
for(const[c,e,i]of r.moc){
const l=F(t,c,e),u=P(t,c,e);
let f=null,p=1/0;
if(u>0)for(const w of n){
const d=Math.hypot(w.x-l[0],w.y-l[1]);
d<p&&(p=d,f=w)
}const x=f?f.canh/(i*u):0,M=!!f&&p<Math.max(4,i*.6)*u&&x>.55&&x<1.6;
o.push(M),M&&a.push({
s:[c,e],d:[f.x,f.y]
})
}return{
ok:o,cap:a,khop:a.length
}
}const J=new WeakMap;
function mt(t){
let r=J.get(t);
if(r)return r;
const n=Math.max(...t.moc.map(a=>a[2])),o=t.moc.filter(a=>a[2]>.8*n).map(a=>[a[0],a[1]]);
if(r=[],o.length<=14)for(let a=0;
a<o.length;
a++)for(let c=a+1;
c<o.length;
c++)for(let e=c+1;
e<o.length;
e++)for(let i=e+1;
i<o.length;
i++){
const l=V([o[a],o[c],o[e],o[i]]);
q(l)>=.15*t.trang[0]*t.trang[1]&&r.push(l)
}return J.set(t,r),r
}function q(t){
let r=0;
for(let n=0;
n<t.length;
n++){
const o=t[n],a=t[(n+1)%t.length];
r+=o[0]*a[1]-a[0]*o[1]
}return Math.abs(r)/2
}const Mt=Array.from({
length:8
},(t,r)=>2*Math.PI*r/8);
function yt(t,r,n,o){
const a=r.rk?.p1??r.r,c=Math.max(1,Math.floor(n.length/80));
let e=0,i=0;
for(let l=0;
l<n.length;
l+=c){
const[u,f]=n[l];
for(const p of Mt){
const x=M=>{
const w=F(t,u+M*Math.cos(p),f+M*Math.sin(p));
return 1-H(o,w[0],w[1])/255
};
e+=x(a)-x(1.4*a),i++
}
}return i?e/i:0
}const xt=.01;
function gt(t,r,n,o,a,c=!0,e=!1){
const i=Math.max(4,Math.ceil(.7*r.moc.length)),l=V(r.goc),u=[],f=(y,s)=>Math.hypot(y[0]-s[0],y[1]-s[1]),p=y=>(f(y[0],y[1])+f(y[2],y[3]))/Math.max(1e-6,f(y[1],y[2])+f(y[3],y[0]));
let x=0;
const M=(y,s=l,m=!1)=>{
const h=V(y.map(k=>[k.x,k.y]));
if(q(h)<.04*n)return;
const g=m?p(s):0,b=m?p(h):0;
for(let k=0;
k<4;
k++){
if(m&&Math.abs(Math.log(g*(k%2?b:1/b)))>.2)continue;
x++;
const T=z(s,h.slice(k).concat(h.slice(0,k)));
if(!T)continue;
const C=Y(T,r,t);
C.khop>=i&&u.push({
H:T,...C
})
}
},w=new Set,d=()=>{
let y=null;
const s=u.filter(m=>!w.has(m)).sort((m,h)=>h.khop-m.khop).slice(0,8);
for(const m of s){
w.add(m);
let h=m;
const g=m.cap.length>=4?z(m.cap.map(k=>k.s),m.cap.map(k=>k.d)):null;
if(g){
const k=Y(g,r,t);
k.khop>=m.khop&&(h={
H:g,khop:k.khop,ok:k.ok
})
}const b=yt(h.H,r,o,a);
(b>=xt||h.khop>=.9*r.moc.length)&&(!y||h.khop>y.khop||h.khop===y.khop&&b>y.d)&&(y={
...h,d:b
})
}return y
},A=t.slice().sort((y,s)=>s.canh-y.canh),I=[];
for(const y of A)I.some(s=>y.canh>.8*s&&y.canh<1.25*s)||I.push(y.canh);
const S=I.slice(0,6).map(y=>A.filter(s=>s.canh>.62*y&&s.canh<1.6*y)).filter(y=>y.length>=4);
for(const y of S){
const s=[y.reduce((h,g)=>g.x+g.y<h.x+h.y?g:h),y.reduce((h,g)=>g.x-g.y>h.x-h.y?g:h),y.reduce((h,g)=>g.x+g.y>h.x+h.y?g:h),y.reduce((h,g)=>g.x-g.y<h.x-h.y?g:h)];
if(new Set(s).size===4&&M(s,l,e),!u.length){
const h=y.slice(0,6);
for(let g=0;
g<h.length;
g++)for(let b=g+1;
b<h.length;
b++)for(let k=b+1;
k<h.length;
k++)for(let T=k+1;
T<h.length;
T++)M([h[g],h[b],h[k],h[T]],l,e)
}const m=u.length?d():null;
if(m)return m
}if(!c)return null;
const U=mt(r);
if(!U.length)return null;
for(const y of S.slice(0,2)){
if(y.length<i)continue;
const s=y.slice().sort((m,h)=>Math.abs(m.tron-.64)-Math.abs(h.tron-.64)).slice(0,7);
for(let m=0;
m<s.length;
m++)for(let h=m+1;
h<s.length;
h++)for(let g=h+1;
g<s.length;
g++)for(let b=g+1;
b<s.length;
b++){
const k=u.length;
for(const T of U)M([s[m],s[h],s[g],s[b]],T,!0);
if(u.length>k){
const T=d();
if(T)return T
}if(x>5e3)return null
}
}return null
}function pt(t,r){
const n=Math.max(1,Math.min(...r.map(l=>l[0]))|0),o=Math.min(t.w-2,Math.max(...r.map(l=>l[0]))|0),a=Math.max(1,Math.min(...r.map(l=>l[1]))|0),c=Math.min(t.h-2,Math.max(...r.map(l=>l[1]))|0);
let e=0,i=0;
for(let l=a;
l<c;
l+=3){
const u=l*t.w;
for(let f=n;
f<o;
f+=3){
const p=t.d[u+f];
e+=Math.abs(p-t.d[u+f+1])+Math.abs(p-t.d[u+f+t.w]),i++
}
}return i?e/i:0
}const Z=self;
let L=null,$=[];
Z.onmessage=t=>{
const r=t.data;
if(r.loai==="khuon"){
L=r.khuon,$=ft(L);
return
}if(!L)return;
const n=ht(L,$,r.id,r.w,r.h,new Uint8ClampedArray(r.buf));
Z.postMessage(n,[n.van,n.vanTrang].flatMap(o=>o?[o.buffer]:[]))
};

