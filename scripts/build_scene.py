"""Rebuild the cabin screenshot as editable Blender geometry. No original models needed.
Run: blender --background --python scripts/build_scene.py
Coordinates passed to helpers use browser convention: X right, Y up, -Z forward.
"""
import bpy, math, random, os, json, bmesh
from mathutils import Vector
random.seed(13)
print('Starting scene', flush=True)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT,'assets'),exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.75,metal=0,alpha=1):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,alpha); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal; p.inputs['Alpha'].default_value=alpha
    if alpha<1: m.surface_render_method='DITHERED'
    return m
M={
 'cedar':mat('Honey cedar',(0.34,.16,.065)), 'lightwood':mat('Fresh cedar edges',(.61,.34,.14)),
 'deck':mat('Weathered deck',(.23,.14,.09)), 'roof':mat('Charcoal standing seam roof',(.055,.075,.075),.48,.25),
 'glass':mat('Lake blue glazing',(.13,.28,.31),.12,.15,.70), 'interior':mat('Interior shadow',(.055,.065,.055)),
 'stone':mat('Granite',(.32,.36,.34)), 'stoneLight':mat('Granite highlights',(.46,.49,.44)),
 'trunk':mat('Pine bark',(.15,.09,.045)), 'pine':mat('Pine needles',(.055,.16,.075)), 'pine2':mat('Sunlit needles',(.1,.23,.10)),
 'sand':mat('Shore sand',(.43,.4,.23)), 'path':mat('Gravel road',(.35,.34,.27)),
 'black':mat('Rubber and cabin trim',(.018,.024,.025)), 'jeep':mat('Graphite jeep paint',(.075,.09,.08),.36,.4),
 'silver':mat('Aluminium',(.58,.65,.64),.28,.7), 'yellow':mat('Floatplane yellow',(.96,.64,.025),.33,.05),
 'red':mat('Scarlet details',(.65,.035,.025)), 'white':mat('Warm white',(.85,.88,.83)),
 'blue':mat('Iceland blue',(.025,.10,.42)), 'crate':mat('Cargo timber',(.49,.32,.13)),
}
grasses=[mat('Meadow '+str(i),(.17+i*.008,.25+i*.009,.075+i*.005)) for i in range(7)]
def v(p): return Vector((p[0],-p[2],p[1]))
def finish(o,name,material,parent=None):
    o.name=name
    if material: o.data.materials.append(material)
    if parent: o.parent=parent
    return o
def box(name,p,s,m,bevel=0,parent=None):
    # Direct mesh allocation avoids repeated scene updates from primitive operators.
    verts=[(p[0]+x*s[0]/2,p[1]+y*s[1]/2,p[2]+z*s[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    o=mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],m,parent)
    if bevel:
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=3,affect='EDGES')
        bm.to_mesh(o.data);bm.free()
    return o
def mesh(name,verts,faces,m,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata([v(p) for p in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,m,parent)
def beam(name,a,b,r,m,parent=None,vertices=12):
    va,vb=Vector(a),Vector(b);direction=(vb-va).normalized()
    u=direction.cross(Vector((0,1,0)))
    if u.length<.001:u=direction.cross(Vector((1,0,0)))
    u.normalize();w=direction.cross(u).normalized()
    verts=[tuple(c+r*(u*math.cos(i*math.tau/vertices)+w*math.sin(i*math.tau/vertices))) for c in (va,vb) for i in range(vertices)]
    faces=[tuple(reversed(range(vertices))),tuple(range(vertices,2*vertices))]+[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    o=mesh(name,verts,faces,m,parent)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o
def ellipsoid(name,p,s,m,parent=None):
    verts=[];faces=[];N=24;R=12
    for j in range(R+1):
        t=math.pi*j/R
        for i in range(N):
            a=i*math.tau/N;verts.append((p[0]+s[0]*math.sin(t)*math.cos(a),p[1]+s[1]*math.cos(t),p[2]+s[2]*math.sin(t)*math.sin(a)))
    for j in range(R):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    o=mesh(name,verts,faces,m,parent)
    for f in o.data.polygons:f.use_smooth=True
    return o

def boulder(name,p,s,m):
    # Smooth broad fracture planes, irregular outline, no triangular ico facets.
    o=ellipsoid(name,p,s,m)
    for vert in o.data.vertices:
        q=vert.co-v(p);n=q.normalized()
        k=1+.10*math.sin(n.x*7+n.y*5)+.055*math.sin(n.z*11-n.x*4)
        vert.co=v(p)+q*k
    return o

def ring(name,p,r,t,m,parent=None,axis='X',segments=40):
    verts=[];faces=[]
    for i in range(segments):
        a=math.tau*i/segments
        for j in range(8):
            b=math.tau*j/8;d=r+t*math.cos(b);q=t*math.sin(b)
            verts.append((p[0]+q,p[1]+d*math.cos(a),p[2]+d*math.sin(a)) if axis=='X' else (p[0]+d*math.cos(a),p[1]+d*math.sin(a),p[2]+q))
    for i in range(segments):
        for j in range(8):faces.append((i*8+j,((i+1)%segments)*8+j,((i+1)%segments)*8+(j+1)%8,i*8+(j+1)%8))
    o=mesh(name,verts,faces,m,parent)
    for f in o.data.polygons:f.use_smooth=True
    return o
def empty(name):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
def shore(x): return 7+2.3*math.sin(x*.075)+.7*math.sin(x*.31)
def height(x,z):
    coast=shore(x)
    if z>coast: return -1.5
    return .8+max(0,-z-22)*.045 + .16*math.sin(x*.15)*math.cos(z*.12)

print('Materials ready', flush=True)
# Sloping pine-covered peninsula and a visible shoreline edge.
verts=[];faces=[];NX=90;NZ=65
for iz in range(NZ+1):
    z=-115+iz*2
    for ix in range(NX+1):
        x=-90+ix*2; verts.append((x,height(x,z),z))
for iz in range(NZ):
    for ix in range(NX):
        a=iz*(NX+1)+ix;faces.extend([(a,a+1,a+NX+2),(a,a+NX+2,a+NX+1)])
terrain=mesh('Meadow terrain',verts,faces,None)
for m in grasses+[M['sand']]:terrain.data.materials.append(m)
for f in terrain.data.polygons:
    c=f.center; x=c.x;z=-c.y; f.material_index=7 if z>shore(x)-2 else random.randrange(7)

print('Terrain ready', flush=True)
# Road loop goes around the cabin rather than through it.
paths=[((-35,-20),(-17,-9)),((-17,-9),(-18,3)),((-35,-20),(-22,-33)),((-22,-33),(17,-36)),((17,-36),(34,-18)),((34,-18),(32,-6)),((32,-6),(28,1)),((28,1),(-18,3))]
for i,((ax,az),(bx,bz)) in enumerate(paths):
    dx,dz=bx-ax,bz-az;d=math.hypot(dx,dz);ox,oz=-dz/d*2.4,dx/d*2.4
    mesh('Gravel track '+str(i),[(ax+ox,height(ax,az)+.035,az+oz),(bx+ox,height(bx,bz)+.035,bz+oz),(bx-ox,height(bx,bz)+.035,bz-oz),(ax-ox,height(ax,az)+.035,az-oz)],[(0,1,2,3)],M['path'])

print('Road ready', flush=True)
# Enlarged timber lodge. The enlargement is in usable floor area, not the scale
# of doors, furniture, vehicles or the surrounding landscape. Browser meters.
X0,X1,Z0,Z1=-2.4,23.4,-26,-6.9
CX=(X0+X1)/2;FLOOR=1.65;UPPER=4.95;EAVE=7.7;RIDGE=11.7
M['lamp']=mat('Warm lamp diffuser',(1,.72,.36),.3)
M['lamp'].node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.55,.18,1)
M['lamp'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2
M['fabric']=mat('Woven oatmeal upholstery',(.43,.39,.31),.92)
M['mortar']=mat('Stone mortar',(.20,.21,.19),.95)
box('Cabin granite plinth',(CX,1.21,(Z0+Z1)/2),(26.6,.88,19.9),M['stone'],.055)
box('Ground floor deck',(CX,1.59,(Z0+Z1)/2),(25.5,.12,18.8),M['deck'])
# Upper slab has a real stairwell rather than a staircase intersecting a solid floor.
for a,b in [(-2.25,8.8),(11.2,23.25)]:box('Upper floor structure',((a+b)/2,4.85,-16.45),(b-a,.2,18.8),M['deck'])
for a,b in [(-25.85,-19),(-13,-7.05)]:box('Upper central floor',(10,4.85,(a+b)/2),(2.4,.2,b-a),M['deck'])
for i in range(18):
    y=1.65+(i+1)*3.3/18;z=-13.5-i*.28
    box('Interior stair tread',(10,y-.045,z),(1.2,.09,.30),M['lightwood'],.012)
for x in [9.36,10.64]:
    beam('Interior stair stringer',(x,1.64,-13.35),(x,4.81,-18.4),.07,M['black'],vertices=4)
    beam('Interior stair handrail',(x,2.65,-13.35),(x,5.85,-18.4),.028,M['black'])
box('Stair upper landing',(10,4.88,-18.7),(2.4,.14,.8),M['deck'])
for x in [8.8,11.2]:
    box('Stairwell handrail',(x,6,-16),(.055,.055,6),M['black'])
    for j in range(13):box('Stairwell baluster',(x,5.48,-19+j*.5),(.035,1.05,.035),M['black'])
# No solid shadow cuboid: real rear walls and partitions provide depth through glass.
for j in range(18):
    y=1.83+j*.33
    # Squared, softly eased heavy timbers. Regular 33 cm courses remain human-scaled.
    intervals=[(X0,X1)]
    if y<4.04: intervals=[(X0,.57),(1.83,4.65),(10.65,11.95)] if y>2.25 else [(X0,.57),(1.83,11.95)]
    elif y<4.75: intervals=[(X0,11.95)]
    elif 4.99<y<7.35: intervals=[(X0,-.1),(6.9,8.4),(12.6,15.6),(21.5,X1)] if y>5.35 else [(X0,8.4),(12.6,X1)]
    for a,b in intervals:box('Front squared timber',((a+b)/2,y,Z1),(b-a,.31,.33),M['cedar'],.025)
    box('Rear squared timber',(CX,y,Z0),(26.05,.31,.33),M['cedar'],.025)
    # Recessed west windows, not glass laid over opaque walls.
    west=[(Z0,Z1)] if not 2.35<y<4.1 else [(Z0,-22),(-18,-15),(-11,Z1)]
    for a,b in west:box('West squared timber',(X0,y,(a+b)/2),(.33,.31,b-a),M['cedar'],.025)
    east=[(Z0,Z1)] if y>=4.75 else [(Z0,-14.1)]
    for a,b in east:box('East squared timber',(X1,y,(a+b)/2),(.33,.31,b-a),M['cedar'],.025)
# Exposed corner joinery and continuous floor headers.
for x in [X0,X1]:
    for z in [Z0,Z1]:box('Corner timber post',(x,4.55,z),(.39,5.8,.39),M['lightwood'],.035)
for y in [1.72,4.65,7.50]:
    box('Front timber header',(CX,y,-6.67),(26.2,.20,.28),M['lightwood'],.025)
    box('East timber header',(23.58,y,-16.4),(.25,.20,19.4),M['lightwood'],.025)
# Main entry: 1.05 m clear leaf, 2.35 m tall. Real jambs, sill, lever and glazing.
for x in [.59,1.81]:box('Entry jamb',(x,2.88,-6.65),(.13,2.55,.27),M['black'],.015)
box('Entry lintel',(1.2,4.14,-6.65),(1.35,.15,.27),M['black'],.015)
box('Entry cedar leaf',(1.2,2.825,-6.60),(1.05,2.35,.12),M['lightwood'],.025)
for y in [1.85+i*.18 for i in range(12)]:
    beam('Diagonal entry detailing',(.70,y,-6.52),(1.70,y+.2,-6.52),.012,M['deck'],vertices=6)
box('Entry threshold',(1.2,1.69,-6.52),(1.35,.07,.42),M['stoneLight'])
beam('Entry pull',(1.60,2.55,-6.46),(1.60,2.91,-6.46),.025,M['black'],vertices=12)

def front_window(name,a,b,y0,y1,z=-6.67,divisions=2):
    box(name+' glazing',((a+b)/2,(y0+y1)/2,z),(b-a,y1-y0,.045),M['glass'])
    for x in [a+(b-a)*i/divisions for i in range(divisions+1)]:box(name+' vertical frame',(x,(y0+y1)/2,z+.05),(.075,y1-y0+.12,.11),M['black'])
    for y in [y0,y1]:box(name+' horizontal frame',((a+b)/2,y,z+.05),(b-a+.12,.075,.11),M['black'])
    box(name+' timber sill',((a+b)/2,y0-.08,z+.10),(b-a+.25,.12,.3),M['lightwood'],.015)
front_window('Panorama window',4.70,10.60,2.30,4.04,divisions=3)
front_window('Corner living room',12.02,23.36,1.83,4.62,divisions=4)
front_window('Upper west bedroom',-.03,6.83,5.35,7.32,divisions=3)
front_window('Balcony French doors',8.46,12.54,5.04,7.32,divisions=4)
front_window('Upper east bedroom',15.66,21.44,5.35,7.32,divisions=3)
for z in [-22,-18,-15,-11]:
    if z in [-22,-15]:
        box('West bedroom glazing',(-2.59,3.22,z+2),(.045,1.7,3.9),M['glass'])
        for zz in [z,z+2,z+4]:box('West window mullion',(-2.62,3.22,zz),(.11,1.85,.075),M['black'])
        for y in [2.35,4.1]:box('West window head sill',(-2.62,y,z+2),(.15,.09,4.1),M['black'])
for z in [-6.95,-9.30,-11.65,-14.02]:box('East glazed wall mullion',(23.57,3.22,z),(.11,2.88,.09),M['black'])
box('East living glass',(23.52,3.22,-10.49),(.045,2.78,7.1),M['glass'])
for y in [1.83,4.62]:box('East glazed wall head sill',(23.58,y,-10.49),(.11,.09,7.2),M['black'])
# Broad gable with layered horizontal cedar boards, roof fascia and deep soffits.
for z in [Z0-.12,Z1+.02]:
    mesh('Gable cedar backing',[(X0,EAVE-.2,z),(X1,EAVE-.2,z),(CX,RIDGE-.14,z)],[(0,1,2),(2,1,0)],M['cedar'])
    for j in range(13):
        y=EAVE+j*.33;lo=y-.155;hi=min(y+.155,RIDGE-.14)
        if hi<=lo:continue
        # Clip every board end to the underside of the roof; rectangular ends
        # otherwise protrude through the sloping metal skin as visible teeth.
        w0=min(12.9,max(0,(RIDGE-.14-lo)*12.9/4));w1=min(12.9,max(0,(RIDGE-.14-hi)*12.9/4))
        verts=[(CX-w0,lo,z-.1),(CX+w0,lo,z-.1),(CX+w1,hi,z-.1),(CX-w1,hi,z-.1),(CX-w0,lo,z+.1),(CX+w0,lo,z+.1),(CX+w1,hi,z+.1),(CX-w1,hi,z+.1)]
        mesh('Clipped gable cedar board',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],M['cedar'])
for x1,x2 in [(-4,CX),(CX,25)]:
    def roof_y(x):return RIDGE-abs(x-CX)*(4/12.9)
    y1,y2=roof_y(x1),roof_y(x2)
    mesh('Standing seam roof skin',[(x1,y1,-27.5),(x2,y2,-27.5),(x2,y2,-4.4),(x1,y1,-4.4)],[(0,1,2,3),(3,2,1,0)],M['roof'])
    for z in [-27.5,-4.4]:
        beam('Roof solid timber fascia',(x1,y1-.08,z),(x2,y2-.08,z),.14,M['lightwood'],vertices=4)
        beam('Roof drip edge',(x1,y1+.025,z),(x2,y2+.025,z),.035,M['black'],vertices=4)
    for i in range(43):
        z=-27.5+i*.55;beam('Roof standing seam',(x1,y1+.04,z),(x2,y2+.04,z),.025,M['black'],vertices=4)
    # Warm shadow under the overhang rather than a paper-thin roof edge.
    mesh('Cedar roof soffit',[(x1,y1-.12,-27.5),(x2,y2-.12,-27.5),(x2,y2-.12,-4.4),(x1,y1-.12,-4.4)],[(3,2,1,0)],M['deck'])
beam('Ridge flashing',(CX,11.75,-27.55),(CX,11.75,-4.35),.09,M['black'],vertices=6)
for x in [-3.95,24.95]:
    y=RIDGE-abs(x-CX)*4/12.9
    beam('Rain gutter',(x,y-.08,-27.5),(x,y-.08,-4.4),.10,M['black'])
    px=x+(.9 if x<0 else -.9)
    beam('Gutter outlet',(x,y-.08,-25.5),(px,y-.5,-25.5),.07,M['black'])
    beam('Downpipe',(px,y-.5,-25.5),(px,1,-25.5),.07,M['black'])
    for yy in [2,4,6]:box('Downpipe bracket',(px,yy,-25.5),(.18,.055,.18),M['silver'])
# Upper balcony spans the lake facade. Human-height balustrade and diamond inlays.
box('Upper balcony edge',(CX,4.86,-5.47),(26.8,.20,2.7),M['deck'])
for i in range(82):box('Balcony deck board',(-2.75+i*.33,4.985,-5.47),(.31,.06,2.7),M['deck'])
for i in range(28):
    x=-2.75+i*.98
    box('Upper balcony post',(x,5.51,-4.10),(.065,1.10,.065),M['black'])
    if i<27:
        c=x+.49
        for a,b in [((c-.13,5.52,-4.1),(c,5.69,-4.1)),((c,5.69,-4.1),(c+.13,5.52,-4.1)),((c+.13,5.52,-4.1),(c,5.35,-4.1)),((c,5.35,-4.1),(c-.13,5.52,-4.1))]:beam('Copper diamond inset',a,b,.018,M['red'],vertices=6)
for y in [5.07,5.33]:box('Upper balcony lower rail',(CX,y,-4.1),(27.1,.045,.065),M['black'])
box('Upper balcony cedar handrail',(CX,6.07,-4.1),(27.1,.09,.13),M['lightwood'],.015)
for x in [-2.75,23.75]:
    box('Balcony return rail',(x,6.07,-5.45),(.13,.09,2.7),M['lightwood'])
    for z in [-6.6,-5.8,-5.0]:box('Balcony return baluster',(x,5.52,z),(.065,1.1,.065),M['black'])
# Lower veranda and a separate, ordinary-size stair approach.
for i in range(169):box('Veranda plank',(-2.95+i*.16,1.58,-4.5),(.15,.14,4),M['deck'])
for x in [-2.8,5.3,12.0,23.7]:
    box('Veranda support',(x,3.23,-4.22),(.20,3.14,.20),M['lightwood'],.025)
    box('Post footing',(x,1.5,-4.22),(.32,.20,.32),M['stoneLight'],.025)
for a,b in [(-3,.3),(2.1,12.0)]:
    box('Veranda handrail',((a+b)/2,2.68,-2.5),(b-a,.10,.14),M['lightwood'],.018)
    box('Veranda bottom rail',((a+b)/2,1.83,-2.5),(b-a,.06,.06),M['black'])
    for i in range(int((b-a)/.18)+1):box('Veranda baluster',(a+i*.18,2.23,-2.5),(.035,.85,.035),M['black'])
for i in range(4):
    # 20 cm risers / 40 cm treads. Top deck1.65, bottom tread1.05.
    box('Entry stair tread',(1.2,1.58-i*.20,-2.70+i*.40),(1.8,.14,.42),M['deck'],.015)
for x in [.30,2.10]:
    beam('Entry stair stringer',(x,.88,-1.35),(x,1.48,-2.55),.075,M['deck'],vertices=4)
    beam('Entry stair handrail',(x,1.95,-1.35),(x,2.55,-2.55),.045,M['lightwood'])
    for z,y in [(-1.35,1.5),(-2.55,2.0)]:box('Stair rail post',(x,y,z),(.075,1.0,.075),M['black'])
# Tall stone chimney, staggered courses, flashing and an open-sided weather hood.
box('Granite chimney',(1.6,8.4,-20),(1.75,8.2,1.55),M['stoneLight'],.035)
for j in range(20):
    y=4.45+j*.39
    box('Chimney mortar bed',(1.6,y,-19.218),(1.75,.018,.015),M['mortar'])
    box('Chimney side mortar',(2.482,y,-20),(.015,.018,1.55),M['mortar'])
    for x in [1.18+(j%2)*.35,1.95+(j%2)*.25]:box('Chimney vertical joint',(x,y+.19,-19.216),(.018,.36,.016),M['mortar'])
box('Chimney lower cap',(1.6,12.54,-20),(2.05,.15,1.85),M['black'],.025)
for x in [1.0,2.2]:beam('Chimney hood support',(x,12.6,-20),(x,12.88,-20),.04,M['black'])
box('Chimney rain hood',(1.6,12.94,-20),(2.2,.12,2),M['black'],.025)
# Interior seen through the wraparound glass: lounge, dining and rear kitchen.
box('Living room rug',(17.5,1.67,-9.6),(6.0,.025,4.4),M['fabric'])
box('Sofa base',(16.7,2.0,-11.1),(3.2,.55,1.05),M['fabric'],.10)
box('Sofa back',(16.7,2.42,-11.55),(3.2,.75,.22),M['fabric'],.08)
for x in [15.62,16.7,17.78]:box('Sofa cushion',(x,2.29,-11.02),(1.01,.16,.85),M['fabric'],.07)
for x in [15.18,18.22]:box('Sofa arm',(x,2.25,-11.1),(.22,.65,1.08),M['fabric'],.07)
box('Lounge table',(17.0,2.07,-8.7),(1.65,.12,.8),M['lightwood'],.035)
for x in [16.35,17.65]:
    for z in [-8.95,-8.45]:beam('Lounge table leg',(x,1.68,z),(x,2.01,z),.025,M['black'])
box('Book on lounge table',(16.7,2.17,-8.7),(.35,.07,.24),M['white'],.01)
beam('Coffee cup',(17.35,2.13,-8.7),(17.35,2.28,-8.7),.065,M['white'],vertices=20)
box('Dining table',(20.8,2.40,-11.8),(1.4,.12,2.4),M['lightwood'],.035)
for x in [20.25,21.35]:
    for z in [-12.8,-10.8]:beam('Dining table leg',(x,1.65,z),(x,2.34,z),.035,M['black'])
for x in [19.65,21.95]:
    for z in [-12.5,-11.1]:
        box('Dining chair seat',(x,2.08,z),(.48,.10,.48),M['fabric'],.035)
        box('Dining chair back',(x+( -.22 if x<21 else .22),2.4,z),(.08,.62,.48),M['lightwood'],.025)
        for dx in [-.18,.18]:
            for dz in [-.18,.18]:beam('Dining chair leg',(x+dx,1.65,z+dz),(x+dx,2.04,z+dz),.02,M['black'],vertices=8)
box('Kitchen rear partition',(17.8,3.1,-15.8),(10.3,2.9,.16),M['lightwood'])
box('Kitchen base cabinetry',(18.6,2.1,-15.1),(6.4,.9,.65),M['deck'],.025)
box('Kitchen stone counter',(18.6,2.59,-15.1),(6.55,.08,.72),M['stoneLight'],.015)
for x in [16,17.1,18.2,19.3,20.4,21.5]:
    box('Kitchen cabinet face',(x,2.12,-14.75),(1.04,.79,.04),M['lightwood'],.015)
    beam('Cabinet pull',(x-.15,2.37,-14.70),(x+.15,2.37,-14.70),.012,M['black'],vertices=8)
box('Kitchen sink',(18.3,2.64,-15.1),(.65,.035,.45),M['silver'],.05)
beam('Kitchen tap',(18.3,2.65,-15.35),(18.3,2.95,-15.35),.022,M['silver'])
beam('Kitchen tap spout',(18.3,2.95,-15.35),(18.3,2.95,-15.12),.022,M['silver'])
# Lanterns and suspended interior lights are fixtures, not oversized bright blobs.
for x in [-.35,11.30,23.55]:
    box('Porch sconce plate',(x,3.6,-6.46),(.20,.35,.06),M['black'],.015)
    box('Warm sconce glass',(x,3.6,-6.35),(.14,.25,.16),M['lamp'],.015)
    for y in [3.44,3.76]:box('Sconce hood',(x,y,-6.35),(.23,.045,.22),M['black'],.015)
for z in [-12.5,-11.1]:
    beam('Pendant cable',(20.8,4.75,z),(20.8,3.5,z),.008,M['black'],vertices=6)
    ellipsoid('Pendant shade',(20.8,3.45,z),(.20,.09,.20),M['black'])
    ellipsoid('Pendant warm lens',(20.8,3.4,z),(.16,.025,.16),M['lamp'])
# Broad rear/side additions feel inhabited without changing vehicle scale.
for x,z in [(22.4,-8.0),(12.7,-6.0)]:
    box('Veranda planter',(x,1.94,z),(.55,.58,.55),M['deck'],.03)
    for dx,dz in [(-.12,0),(.1,.1),(0,-.13)]:beam('Planter foliage',(x+dx,2.2,z+dz),(x+dx*.8,2.85,z+dz*.8),.065,M['pine'],vertices=6)
print('CABIN_ENVELOPE',{'foundation':[-2.8,23.8,-26.4,-6.5],'veranda':[-3,24,-6.5,-2.5],'ridge':11.79,'highest':13.0,'floor':1.65,'upper':4.95},flush=True)

print('Cabin ready', flush=True)
# Jetty is a real planked structure on stilts.
for i in range(30):box('Dock plank',(-18,1.45,2+i*.48),(5.6,.16,.43),M['deck'])
for z in [3,7,11,15]:
    for x in [-20.9,-15.1]:beam('Dock piling',(x,-2,z),(x,2,z),.16,M['lightwood'])
for x in [-20.6,-15.4]:box('Dock edge beam',(x,1.3,9),(.2,.35,14.5),M['cedar'])
# Canoe hull as a tapered open vessel.
verts=[]
for z in [-3,-2,-1,0,1,2,3]:
    w=.75*(1-(abs(z)/3.1)**2)
    for x,y in [(-w,.55),(0,.15),(w,.55)]:verts.append((-13+x,y,14+z))
faces=[]
for i in range(6):
    for j in range(2):a=i*3+j;faces.append((a,a+1,a+4,a+3))
mesh('Cedar canoe',verts,faces,M['lightwood'])
for z in [12.5,15.5]:box('Canoe seat',(-13,.45,z),(1.05,.08,.3),M['deck'])
beam('Canoe paddle',(-13.5,.7,12.8),(-12.5,.7,16),.04,M['lightwood'])

# A rocky stream on the right flows to the lake.
for i in range(18):
    z=-27+i*2;x=27+math.sin(i*.4)*2.2
    for side in [-1,1]:boulder('Stream granite',(x+side*1.8,height(x,z)+.1,z),(1.2+random.random(),.8+random.random()*.4,1.2),M['stoneLight'])
    box('Stream bed',(x,height(x,z)+.12,z),(3.3,.09,2.3),M['glass'])
for i in range(20):
    x=random.uniform(30,49);z=random.uniform(-25,6);r=random.uniform(.6,2.3)
    boulder('Glacial boulder',(x,height(x,z)+.4,z),(r*1.3,r*.8,r),M['stone'])

# Icelandic flag, constructed as a double-sided gently curved grid.
beam('Flagpole',(33,1.1,2),(33,11.5,2),.055,M['silver'])
for iy in range(12):
    for ix in range(21):
        u=ix/21;vv=iy/12
        def flagp(u,t):return (33+u*4,11.2-t*2.7,2+math.sin(u*6+t*2)*.27*u)
        crossH=abs(vv-.5)<.13; crossV=abs(u-.34)<.09;redH=abs(vv-.5)<.055;redV=abs(u-.34)<.035
        material=M['red'] if redH or redV else M['white'] if crossH or crossV else M['blue']
        mesh('Flag cloth',[flagp(u,vv),flagp(u+1/21,vv),flagp(u+1/21,vv+1/12),flagp(u,vv+1/12)],[(0,1,2,3),(3,2,1,0)],material)

print('Landscape details ready', flush=True)
# Conifer forest. Shared simple geometry is merged into material batches below.
for i in range(65):
    x=random.uniform(-85,85);z=random.uniform(-107,-25)
    if -39<x<40 and z>-48:continue
    h=random.uniform(5,13);base=height(x,z)
    beam('Pine trunk',(x,base,z),(x,base+h*.85,z),.13,M['trunk'],vertices=6)
    for k in range(4):
        r=h*(.20-.029*k);y=base+h*(.32+.16*k);depth=h*.48
        verts=[(x+r*math.cos(j*math.tau/7),y-depth/2,z+r*math.sin(j*math.tau/7)) for j in range(7)]+[(x,y+depth/2,z)]
        mesh('Pine crown',verts,[tuple(range(7))]+[(j,7,(j+1)%7) for j in range(7)],M['pine'] if (i+k)%3 else M['pine2'])

print('Forest ready', flush=True)
# Hero jeep, separate transform root for gameplay.
jeep=empty('JeepRoot')
box('Chassis',(0,.63,0),(2.15,.45,4.1),M['jeep'],.12,jeep)
box('Hood',(0,1.12,-1.25),(2.05,.45,1.4),M['jeep'],.1,jeep)
box('Rear body',(0,1.1,1.1),(2.05,.75,1.5),M['jeep'],.12,jeep)
box('Cabin roof',(0,2.32,.35),(2.15,.14,2.7),M['jeep'],.08,jeep)
box('Windshield',(0,1.85,-.86),(1.88,.8,.07),M['glass'],.025,jeep)
for x in [-1,1]:
    box('Side windows',(x,1.85,.35),(.06,.75,2.25),M['glass'],.01,jeep)
    for z in [-.9,.25,1.5]:box('Cabin pillar',(x,1.85,z),(.12,.92,.12),M['black'],0,jeep)
    box('Door',(x,1.22,.1),(.1,.65,1.7),M['jeep'],.03,jeep)
    box('Mirror',(x*1.2,1.8,-.7),(.28,.18,.25),M['black'],.04,jeep)
    for z in [-1.25,1.25]:
        wheel=empty('JeepWheel'+('Left' if x<0 else 'Right')+('Front' if z<0 else 'Rear'))
        wheel.parent=jeep;wheel.location=v((x*1.09,.65,z))
        ring('Rounded all terrain sidewall',(0,0,0),.425,.145,M['black'],wheel)
        beam('Wheel barrel',(-.16,0,0),(.16,0,0),.29,M['black'],wheel,32)
        ring('Machined rim lip',(x*.168,0,0),.26,.025,M['silver'],wheel)
        beam('Central hub',(x*.16,0,0),(x*.205,0,0),.095,M['silver'],wheel,20)
        for j in range(6):
            t=j*math.tau/6
            beam('Alloy spoke',(x*.175,.085*math.cos(t),.085*math.sin(t)),(x*.175,.24*math.cos(t),.24*math.sin(t)),.036,M['silver'],wheel,8)
            beam('Wheel lug',(x*.20,.065*math.cos(t),.065*math.sin(t)),(x*.22,.065*math.cos(t),.065*math.sin(t)),.016,M['black'],wheel,6)
        for j in range(36):
            t=j*math.tau/36
            for dx in [-.10,.10]:
                # Tangential blocks follow the tire circumference and are not cubes floating off the tread.
                o=box('Tire tread block',(0,0,0),(.15,.045,.085),M['black'],.012,wheel)
                o.location=v((dx,.565*math.cos(t),.565*math.sin(t)));o.rotation_euler.x=t
        # Continuous flared sheet-metal arch, not a chain of capped cylinders.
        fv=[];ff=[];steps=24
        for j in range(steps+1):
            a=math.pi*j/steps
            for xx,r in [(x*.98,.675),(x*1.27,.675),(x*1.27,.745),(x*.98,.745)]:
                fv.append((xx,.65+r*math.sin(a),z+r*math.cos(a)))
        for j in range(steps):
            for k in range(4):ff.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
        ff.extend([(3,2,1,0),tuple(steps*4+k for k in range(4))])
        arch=mesh('Continuous fender flare',fv,ff,M['black'],jeep)
        # Outward normals for mirrored sides, with hard profile edges retained.
        bm=bmesh.new();bm.from_mesh(arch.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(arch.data);bm.free()
for x in [-.78,.78]:ellipsoid('Jeep headlight',(x,1.1,-2.02),(.22,.22,.08),M['white'],jeep)
for x in [-.45,-.3,-.15,0,.15,.3,.45]:box('Grille',(x,1,-2.04),(.07,.42,.07),M['black'],0,jeep)
box('Bull bar',(0,.8,-2.23),(2.35,.14,.14),M['silver'],.04,jeep)
for x in [-.65,-.22,.22,.65]:ellipsoid('Rally lamp',(x,1.45,-2.1),(.18,.18,.10),M['white'],jeep)
beam('Spare tire',(0,1.1,2.03),(0,1.1,2.34),.55,M['black'],jeep,16)
for x in [-.75,.75]:beam('Roof rack',(x,2.45,-.7),(x,2.45,1.4),.05,M['silver'],jeep)
# Functional-looking vehicle details without badges or branding.
for x in [-.94,.94]:
    box('Rock slider',(x,.58,.1),(.25,.14,1.65),M['silver'],.04,jeep)
    box('Door pull',(x*1.10,1.43,.34),(.06,.06,.27),M['silver'],.025,jeep)
    beam('Mirror arm',(x,1.65,-.7),(x*1.25,1.8,-.7),.035,M['silver'],jeep)
    box('Mirror reflective face',(x*1.28,1.8,-.55),(.22,.12,.025),M['silver'],.02,jeep)
    box('Front seat',(x*.55,1.1,.2),(.65,.18,.75),M['fabric'],.08,jeep)
    box('Front seat back',(x*.55,1.5,.55),(.65,.85,.17),M['fabric'],.08,jeep)
    box('Head rest',(x*.55,2,.55),(.36,.23,.14),M['black'],.05,jeep)
    box('Rear tail lamp',(x*.85,1.35,1.90),(.20,.30,.08),M['red'],.035,jeep)
    beam('Roof rack side',(x*.8,2.6,-.8),(x*.8,2.6,1.5),.04,M['silver'],jeep)
    for z in [-.7,1.4]:beam('Rack foot',(x*.8,2.35,z),(x*.8,2.6,z),.035,M['black'],jeep)
box('Dashboard',(0,1.5,-.65),(1.8,.22,.35),M['black'],.04,jeep)
ring('Steering wheel',(-.51,1.68,-.35),.22,.025,M['black'],jeep,axis='Z')
for x in [-.65,.65]:
    beam('Wiper',(x,1.5,-.91),(x+.3,1.85,-.91),.018,M['black'],jeep,6)
for z in [-.7,0,.7,1.4]:beam('Rack crossbar',(-.8,2.55,z),(.8,2.55,z),.035,M['silver'],jeep)
for z in [-2.15,2.10]:box('Heavy bumper',(0,.58,z),(2.25,.25,.25),M['black'],.07,jeep)
for x in [-.85,.85]:beam('Tow eye',(x,.5,-2.25),(x,.65,-2.25),.04,M['silver'],jeep)
box('Rear window',(0,1.86,1.59),(1.8,.66,.045),M['glass'],.025,jeep)
jeep.location=v((-16,.92,-9));jeep.rotation_euler.z=math.radians(-25)

print('Jeep ready', flush=True)
# Yellow single-engine floatplane, +Y Blender / -Z browser nose.
plane=empty('PlaneRoot')
# Lofted utility-aircraft body: broad cabin and a narrow rising tail, with a
# short radial cowling rather than the original oversized spherical nose.
verts=[];faces=[];N=24
stations=[(-2.9,.65,.63,1.6),(-1.3,.68,.68,1.6),(.5,.65,.66,1.6),(1.6,.42,.44,1.7),(3.3,.14,.17,1.9),(3.7,.08,.10,1.9)]
for z,rx,ry,y in stations:
    for i in range(N):
        a=math.tau*i/N;verts.append((rx*math.cos(a),y+ry*math.sin(a),z))
for j in range(len(stations)-1):
    for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
faces.extend([tuple(reversed(range(N))),tuple(range((len(stations)-1)*N,len(stations)*N))])
body=mesh('Tapered floatplane fuselage',verts,faces,M['yellow'],plane)
for f in body.data.polygons:f.use_smooth=len(f.vertices)==4
beam('Radial engine cowling',(0,1.6,-3.65),(0,1.6,-2.65),.69,M['yellow'],plane,40)
ellipsoid('Rounded cowling front',(0,1.6,-3.65),(.69,.69,.18),M['yellow'],plane)
ring('Cowling front seam',(0,1.6,-3.69),.65,.018,M['black'],plane,axis='Z')
ellipsoid('Cockpit glass',(0,2.04,-.6),(.68,.64,1.08),M['glass'],plane)
# Closed airfoil profile, tapered outer wing and thin trailing edge.
def airfoil(name,span,chord,y,z,material,parent):
    verts=[];faces=[];N=24
    for x,c,dy in [(-span/2,.83,.12),(-span*.42,1,.02),(0,1,0),(span*.42,1,.02),(span/2,.83,.12)]:
        for i in range(N):
            a=math.tau*i/N;u=(1-math.cos(a))/2
            thickness=.12*chord*(.2969*math.sqrt(max(u,0))-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)/.2
            verts.append((x,y+dy+(.018*chord*math.sin(math.pi*u))+(1 if i<N/2 else -1)*thickness*c,z+(u-.5)*chord*c))
    for j in range(4):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    faces.extend([tuple(reversed(range(N))),tuple(range(4*N,5*N))])
    o=mesh(name,verts,faces,material,parent)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o
airfoil('Cambered high wing',12.8,1.95,2.7,-.15,M['yellow'],plane)
box('Tailplane',(0,1.9,2.8),(4.6,.14,1.2),M['yellow'],.08,plane)
mesh('Vertical stabilizer',[(-.06,1.75,2.6),(-.06,4,3),(-.06,4,3.65),(-.06,1.75,3.7),(.06,1.75,2.6),(.06,4,3),(.06,4,3.65),(.06,1.75,3.7)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3)],M['yellow'],plane)
for x in [-1.3,1.3]:
    ellipsoid('Float',(x,.16,-.25),(.35,.32,3.2),M['silver'],plane)
    for z in [-1.8,1.5]:beam('Float strut',(x,.38,z),(x*.45,1.35,z),.045,M['silver'],plane)
    beam('Wing brace',(x*.45,1.3,.5),(x*4.1,2.65,.2),.045,M['silver'],plane)
for x in [-.73,.73]:
    beam('Red fuselage stripe',(x,1.67,-2),(x*.2,1.87,3.2),.065,M['red'],plane)
    box('Wingtip',(x*8.3,2.7,-.15),(.5,.21,1.95),M['pine'],.04,plane)
prop=empty('Propeller');prop.parent=plane;prop.location=v((0,1.6,-4))
box('Propeller blade',(0,0,0),(.14,2.9,.09),M['black'],.06,prop)
ellipsoid('Spinner',(0,1.6,-4.03),(.21,.21,.3),M['silver'],plane)
# Cockpit framing, control surfaces and twin pontoon rigging.
for x in [-.59,.59]:
    beam('Cockpit windshield frame',(x,1.95,-1.55),(x*.8,2.55,-.95),.035,M['black'],plane)
    beam('Cockpit top frame',(x*.8,2.55,-.95),(x,2.45,.25),.035,M['black'],plane)
    beam('Cockpit rear frame',(x,2.45,.25),(x,1.95,.45),.035,M['black'],plane)
    beam('Cockpit door sill',(x,1.95,-1.55),(x,1.95,.45),.035,M['yellow'],plane)
    beam('Cockpit middle frame',(x,1.95,-.2),(x,2.5,-.2),.028,M['yellow'],plane)
    box('Plane seat',(x*.55,1.94,-.5),(.40,.15,.50),M['fabric'],.05,plane)
    box('Plane seat back',(x*.55,2.17,-.05),(.4,.5,.12),M['black'],.04,plane)
for x in [-1.3,1.3]:
    box('Pontoon nonslip deck',(x,.45,-.15),(.36,.045,3.8),M['black'],.04,plane)
    beam('Pontoon outer seam',(x+.30,.19,-2.3),(x+.30,.19,2.1),.018,M['silver'],plane)
    for z in [-1.3,.8]:
        beam('Float crossbeam',(-1.3,.47,z),(1.3,.47,z),.04,M['silver'],plane)
        beam('Float diagonal wire',(x,.48,z),(x*.25,1.30,z+.5),.014,M['black'],plane,6)
    box('Water rudder',(x,-.12,2.65),(.07,.55,.38),M['black'],.03,plane)
    beam('Water rudder linkage',(x,.42,2.3),(x,-.12,2.65),.025,M['silver'],plane)
for sign in [-1,1]:
    beam('Aileron hinge',(sign*3,2.72,.57),(sign*5.8,2.8,.55),.012,M['black'],plane,6)
    beam('Wing leading seam',(sign*.8,2.72,-1.1),(sign*5.4,2.75,-1.1),.012,M['silver'],plane,6)
    beam('Wing second brace',(sign*.6,1.35,-.9),(sign*5.2,2.65,-.7),.035,M['silver'],plane)
    beam('Tail brace',(sign*.35,1.6,2),(sign*1.9,1.92,2.9),.018,M['silver'],plane,8)
beam('Windscreen center',(0,2.1,-1.6),(0,2.63,-1),.025,M['yellow'],plane)
beam('Engine exhaust',(.56,1.3,-3.2),(.85,1.1,-3),.075,M['black'],plane)
beam('Antenna',(0,2.35,1),(0,3,1.2),.015,M['black'],plane,6)
plane.location=v((-25,.14,14));plane.rotation_euler.z=math.radians(80)

print('Plane ready', flush=True)
# Meter-scaled box-projected UVs for the runtime timber PBR maps. Directly
# allocated meshes need explicit coordinates; joined material batches retain them.
for o in bpy.context.scene.objects:
    if o.type!='MESH' or o.data.uv_layers:continue
    uv=o.data.uv_layers.new(name='UVMap')
    for f in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(f.normal[a]))
        axes=([1,2] if axis==0 else [0,2] if axis==1 else [0,1])
        for li in f.loop_indices:
            p=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(p[axes[0]]*.18,p[axes[1]]*.18)

# Batch material geometry within each transform root. Wheel pivots and propeller
# stay separate, while the hero objects cost tens rather than hundreds of draws.
groups={}
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':continue
    key=(o.parent.name if o.parent else 'Landscape',o.data.materials[0].name if len(o.data.materials)==1 else o.name)
    groups.setdefault(key,[]).append(o)
for (parent_name,name),objs in groups.items():
    if len(objs)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name=parent_name+' / '+name

# Lighting and camera are retained in editable source, runtime supplies its own sky/water.
bpy.ops.object.light_add(type='SUN',location=(-30,-20,45));sun=bpy.context.object;sun.name='Golden hour sun';sun.data.energy=3.2;sun.data.angle=.12;sun.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-35))
world=bpy.data.worlds.new('Blue hour atmosphere');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.27,.42,.6,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.camera_add(location=v((-49,24,55)));camera=bpy.context.object;camera.rotation_euler=(v((0,4,-7))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=43;bpy.context.scene.camera=camera
# Keep a preview water surface out of the glTF; browser uses animated shader water.
water=box('Preview water only',(0,-.11,30),(500,.1,500),mat('Preview water',(.055,.17,.24),.18,.38));water.hide_render=False
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=48;bpy.context.scene.cycles.use_denoising=False
bpy.context.scene.render.resolution_x=1440;bpy.context.scene.render.resolution_y=960;bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','northbound.blend'),compress=True)
water.hide_set(True);bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type in ('MESH','EMPTY') and o!=water:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','northbound.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
water.hide_set(False)
if os.environ.get('CABIN_RENDER')=='1':
    bpy.context.scene.render.filepath=os.path.join(ROOT,'assets','blender-progress.png');bpy.ops.render.render(write_still=True)
print('CABIN_SCENE_DONE',len(bpy.context.scene.objects))
