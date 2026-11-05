"""Rebuild the cabin screenshot as editable Blender geometry. No original models needed.
Run: blender --background --python scripts/build_scene.py
Coordinates passed to helpers use browser convention: X right, Y up, -Z forward.
"""
import bpy, math, random, os, json
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
    bpy.ops.mesh.primitive_cube_add(size=1,location=v(p)); o=bpy.context.object; o.dimensions=(s[0],s[2],s[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)
def mesh(name,verts,faces,m,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata([v(p) for p in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,m,parent)
def beam(name,a,b,r,m,parent=None,vertices=10):
    a,b=v(a),v(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,m,parent)
def ellipsoid(name,p,s,m,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=v(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,name,m,parent)
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
# Two-story log cabin, floor area 20 x 12 m, front faces the lake (+Z).
cx,cz=8,-13
box('Cabin stone foundation',(cx,1.1,cz),(21,.7,13),M['stone'])
box('Cabin inner wall shadow',(cx,4.2,cz),(20,5.8,12),M['interior'])
for j in range(13):
    y=1.65+j*.42;m=M['cedar'] if j%2 else M['lightwood']
    # Front sections leave a door, panoramic window and glazed corner.
    for a,b in [(-2,0),(2.2,3.7),(9.2,10.6)]:
        if 2<y<4.5: beam('Front log',(a,y,-6.9),(b,y,-6.9),.25,m,vertices=10)
    if y<=2 or y>=4.5: beam('Front full log',(-2.4,y,-6.9),(18.4,y,-6.9),.25,m,vertices=10)
    beam('Back log',(-2.4,y,-19.1),(18.4,y,-19.1),.25,m,vertices=10)
    beam('Left log',(-2.1,y,-19.4),(-2.1,y,-6.6),.25,m,vertices=10)
    if y>4.5 or y<2: beam('Right log',(18.1,y,-19.4),(18.1,y,-6.6),.25,m,vertices=10)
    else: beam('Right rear log',(18.1,y,-19.4),(18.1,y,-12.7),.25,m,vertices=10)
box('Door frame',(1.05,3.05,-6.62),(2.4,3.25,.22),M['black'])
box('Diagonal cedar door',(1.05,3.05,-6.45),(1.9,2.95,.12),M['lightwood'])
for y in [1.9,2.35,2.8,3.25,3.7,4.15]: beam('Door slat',(0.1,y,-6.34),(1.95,y+.4,-6.34),.022,M['deck'],vertices=6)
ellipsoid('Door handle',(1.73,3.1,-6.24),(.06,.06,.09),M['silver'])
box('Panorama window frame',(6.4,3.32,-6.55),(5.8,2.05,.18),M['black'])
box('Panorama glass',(6.4,3.32,-6.4),(5.5,1.78,.05),M['glass'])
box('Front glass bay',(14.3,3.15,-6.72),(7.2,3.9,.06),M['glass'])
box('Side glass bay',(18.2,3.15,-9.8),(.06,3.9,6.3),M['glass'])
for x in [10.7,14.3,18.0]:box('Front glass mullion',(x,3.15,-6.58),(.10,4,.12),M['black'])
for z in [-6.8,-9.8,-12.8]:box('Side glass mullion',(18.23,3.15,z),(.1,4,.1),M['black'])
box('Glass top frame',(14.4,5.12,-6.6),(7.4,.1,.1),M['black'])
box('Interior floor',(13.9,1.55,-9.5),(7.5,.15,5.8),M['lightwood'])
box('Cabin sofa',(13.6,2,-10.8),(3,.7,1.15),M['white'],.15)
box('Sofa back',(13.6,2.55,-11.25),(3,.8,.28),M['white'],.1)
box('Coffee table',(13.6,2.03,-8.7),(2,.14,.9),M['deck'])
for x in [12.8,14.4]:beam('Table leg',(x,1.6,-8.7),(x,2,-8.7),.055,M['black'])
# Main pitched roof and cedar gable.
mesh('Cedar gable',[(-2.5,7,-19.5),(18.5,7,-19.5),(8,11,-19.5),(-2.5,7,-6.5),(18.5,7,-6.5),(8,11,-6.5)],[(0,1,2),(3,5,4)],M['cedar'])
for x1,x2 in [(-4,8),(8,20)]:
    y1=11.2-abs(x1-8)*.35;y2=11.2-abs(x2-8)*.35
    mesh('Charcoal roof panel',[(x1,y1,-21),(x2,y2,-21),(x2,y2,-4.8),(x1,y1,-4.8)],[(0,1,2,3),(3,2,1,0)],M['roof'])
    beam('Roof cedar edge',(x1,y1,-4.8),(x2,y2,-4.8),.18,M['lightwood'])
    for z in range(-21,-4):beam('Roof standing seam',(x1,y1+.03,z),(x2,y2+.03,z),.035,M['black'],vertices=4)
# Front balcony immediately below the gable.
box('Upper terrace',(8,6.98,-5.7),(21.6,.22,2.5),M['deck'])
for x in [i-2.5 for i in range(22)]:
    box('Balcony baluster',(x,7.6,-4.48),(.09,1.3,.09),M['black'])
    if int(x+.5)%2==0:
        beam('Balcony diagonal',(x-.36,7.5,-4.45),(x,7.82,-4.45),.034,M['red'],vertices=6)
        beam('Balcony diagonal',(x,7.82,-4.45),(x+.36,7.5,-4.45),.034,M['red'],vertices=6)
box('Balcony rail',(8,8.3,-4.48),(21.8,.12,.15),M['lightwood'])
box('Balcony lower rail',(8,7.2,-4.48),(21.8,.12,.12),M['black'])
box('Stone chimney',(0,9,-16),(1.6,5,1.4),M['stoneLight'])
box('Chimney cap',(0,11.6,-16),(2,.2,1.8),M['black'])
# Lower deck and steps.
for x in [i*.38-3 for i in range(39)]:box('Porch plank',(x,1.8,-4.6),(.35,.15,3.8),M['deck'])
for x in [-3,2,7,11.5]:beam('Porch post',(x,.9,-2.75),(x,3.1,-2.75),.075,M['lightwood'])
for x in [i*.3-3 for i in range(49)]:
    if -.1<x<2.4:continue
    box('Porch baluster',(x,2.5,-2.75),(.06,1.15,.06),M['lightwood'])
for a,b in [(-3,-.15),(2.4,11.5)]:box('Porch handrail',((a+b)/2,3.12,-2.75),(b-a,.14,.16),M['cedar'])
for i in range(4):box('Porch stair',(1.1,1.65-i*.22,-2.3+i*.48),(2.6,.2,.56),M['deck'])

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
    for side in [-1,1]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=v((x+side*1.8,height(x,z)+.1,z)))
        o=bpy.context.object;o.scale=(1.2+random.random(),1.2,1);finish(o,'Stream granite',M['stoneLight'])
    box('Stream bed',(x,height(x,z)+.12,z),(3.3,.09,2.3),M['glass'])
for i in range(20):
    x=random.uniform(30,49);z=random.uniform(-25,6)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.6,2.3),location=v((x,height(x,z)+.4,z)))
    o=bpy.context.object;o.scale=(1.3,1,.8);finish(o,'Glacial boulder',M['stone'])

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
        bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=h*(.20-.029*k),radius2=0,depth=h*.48,location=v((x,base+h*(.32+.16*k),z)))
        finish(bpy.context.object,'Pine crown',M['pine'] if (i+k)%3 else M['pine2'])

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
        beam('Jeep tire',(x*.9,.65,z),(x*1.25,.65,z),.57,M['black'],jeep,16)
        beam('Wheel hub',(x*1.24,.65,z),(x*1.27,.65,z),.29,M['silver'],jeep,12)
for x in [-.78,.78]:ellipsoid('Jeep headlight',(x,1.1,-2.02),(.22,.22,.08),M['white'],jeep)
for x in [-.45,-.3,-.15,0,.15,.3,.45]:box('Grille',(x,1,-2.04),(.07,.42,.07),M['black'],0,jeep)
box('Bull bar',(0,.8,-2.23),(2.35,.14,.14),M['silver'],.04,jeep)
for x in [-.65,-.22,.22,.65]:ellipsoid('Rally lamp',(x,1.45,-2.1),(.18,.18,.10),M['white'],jeep)
beam('Spare tire',(0,1.1,2.03),(0,1.1,2.34),.55,M['black'],jeep,16)
for x in [-.75,.75]:beam('Roof rack',(x,2.45,-.7),(x,2.45,1.4),.05,M['silver'],jeep)
jeep.location=v((-16,.92,-9));jeep.rotation_euler.z=math.radians(-25)

print('Jeep ready', flush=True)
# Yellow single-engine floatplane, +Y Blender / -Z browser nose.
plane=empty('PlaneRoot')
ellipsoid('Floatplane fuselage',(0,1.6,0),(.74,.8,3.8),M['yellow'],plane)
ellipsoid('Engine cowling',(0,1.6,-3.1),(.78,.77,.82),M['yellow'],plane)
ellipsoid('Cockpit glass',(0,2.04,-.6),(.68,.64,1.08),M['glass'],plane)
box('High wing',(0,2.7,-.15),(12.8,.19,1.95),M['yellow'],.10,plane)
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
plane.location=v((-25,.14,14));plane.rotation_euler.z=math.radians(80)

print('Plane ready', flush=True)
# Optimize static meshes into material batches. Hero parts remain individually editable.
static=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.parent]
groups={}
for o in static:
    key=o.data.materials[0].name if len(o.data.materials)==1 else o.name
    groups.setdefault(key,[]).append(o)
for name,objs in groups.items():
    if len(objs)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name='Landscape / '+name

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
bpy.context.scene.render.filepath=os.path.join(ROOT,'assets','blender-progress.png');bpy.ops.render.render(write_still=True)
print('CABIN_SCENE_DONE',len(bpy.context.scene.objects))
