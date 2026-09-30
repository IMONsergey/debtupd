// Analytic atmospheric rim: the original shared Orbit silhouette, without volumetric ray marching.
// Two cheap 2D noise samples shape the moving light instead of 12 x 3 octaves of 3D noise per pixel.
export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}
`;
export const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uHorizonY;
uniform float uHorizonX;
uniform float uHorizonR;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
  vec2 uv=vec2(vUv.x,1.-vUv.y);
  float aspect=uRes.y/uRes.x;
  vec2 P=vec2(uv.x-uHorizonX,(uv.y-uHorizonY)*aspect);
  float d=length(P-vec2(0.,uHorizonR))-uHorizonR;
  float aa=1.5/uRes.x;
  // Surface below the planet cannot be seen. Avoid any lighting work there.
  if(d < -aa*2. || d > .38){gl_FragColor=vec4(0.);return;}
  float above=smoothstep(-aa,aa,d);
  float height=max(d,0.);
  float idle=uHorizonX+sin(uTime*.48)*.24;
  float lightX=mix(idle,clamp(uMouse.x,.04,.96),uHover);
  float dx=uv.x-lightX;
  float cursorWidth=mix(.14,.2,clamp(1.-uMouse.y,0.,1.));
  float focus=exp(-pow(dx/cursorWidth,2.));
  float wisps=noise(vec2(uv.x*15.+uTime*.27,height*21.-uTime*.68));
  float fine=noise(vec2(uv.x*34.-uTime*.14,height*36.+uTime*.22));
  float energy=mix(1.2,3.4,uHover)*(.92+.08*sin(uTime*1.4));
  float thin=exp(-height*410.)*above;
  float halo=exp(-height*26.)*above;
  float plume=exp(-pow(dx/(.065+height*.55),2.))*exp(-height*10.)*above;
  float bands=.72+.2*wisps+.08*fine;
  vec3 blue=vec3(.025,.27,.84),cyan=vec3(.18,.73,1.),white=vec3(.8,.97,1.);
  vec3 col=blue*halo*(.16+focus*1.1*energy)*bands;
  col+=cyan*thin*(.1+focus*2.25*energy);
  col+=white*thin*focus*energy*.48;
  col+=cyan*plume*(.2+.46*wisps)*energy;
  // Fade out before the sampling boundary so a bright plume never forms a hard arc.
  col*=1.-smoothstep(.24,.37,height);
  col=vec3(1.)-exp(-col);
  float alpha=clamp(max(max(col.r,col.g),col.b),0.,.98);
  gl_FragColor=vec4(col/max(alpha,.001),alpha);
}
`;
