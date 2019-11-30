namespace spine {
    class AdapterTexture extends Texture {
        public readonly spriteSheet: egret.SpriteSheet;

        public constructor(bitmapData: egret.BitmapData) {
            super(bitmapData.source);
            let texture = new egret.Texture();
            texture.bitmapData = bitmapData;
            this.spriteSheet = new egret.SpriteSheet(texture);
        }

        /** NIY */
        setFilters(minFilter: TextureFilter, magFilter: TextureFilter): void { }
        setWraps(uWrap: TextureWrap, vWrap: TextureWrap): void { }
        dispose(): void { }
    }

    export function createSkeletonData(jsonData: string | {}, atlas: TextureAtlas) {
        let json = new SkeletonJson(new AtlasAttachmentLoader(atlas));
        return json.readSkeletonData(jsonData);
    }

    export function createTextureAtlas(atlasData: string, textures: Record<string, egret.Texture>) {
        return new TextureAtlas(atlasData, (file: string) => {
            return new AdapterTexture(textures[file].bitmapData);
        });
    }

    export class SkeletonRenderer extends egret.DisplayObjectContainer {
        public readonly skeleton: Skeleton;
        public readonly skeletonData: SkeletonData;
        public readonly state: AnimationState;
        public readonly stateData: AnimationStateData;
        public readonly slotRenderers: SlotRenderer[] = [];
        private colored: boolean = false;

        static vertices = Utils.newFloatArray(8 * 1024);
        static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
        static VERTEX_SIZE = 2 + 2 + 4;
        static clipper: SkeletonClipping = new SkeletonClipping();

        public constructor(skeletonData: SkeletonData) {
            super();
            this.skeletonData = skeletonData;
            this.stateData = new AnimationStateData(skeletonData);
            this.state = new AnimationState(this.stateData);
            this.skeleton = new Skeleton(skeletonData);
            this.skeleton.updateWorldTransform();
            this.touchEnabled = true;
            this.scaleY = -1;

            for (let slot of this.skeleton.slots) {
                let renderer = new SlotRenderer();

                renderer.name = slot.data.name;
                this.slotRenderers.push(renderer);
                this.addChild(renderer);
                renderer.renderSlot(slot, this.skeleton, this.colored);
                this.colored = renderer.colored;

            }
            SkeletonRenderer.clipper.clipEnd();
        }

        public findSlotRenderer(name: string): SlotRenderer {
            return this.getChildByName(name) as SlotRenderer;
        }

        public update(dt: number) {
            this.state.update(dt);
            this.state.apply(this.skeleton);
            this.skeleton.updateWorldTransform();

            let drawOrder = this.skeleton.drawOrder;
            let slots = this.skeleton.slots;

            for (let i = 0; i < drawOrder.length; i++) {
                let slot = drawOrder[i].data.index;
                this.setChildIndex(this.slotRenderers[slot], i);
            }
            for (let i = 0; i < slots.length; i++) {
                let renderer = this.slotRenderers[i];

                renderer.renderSlot(slots[i], this.skeleton, this.colored);
                this.colored = renderer.colored;
            }
            SkeletonRenderer.clipper.clipEnd();
        }
    }

    export class SlotRenderer extends egret.DisplayObjectContainer {
        public colored: boolean = false;
        private currentMesh: egret.DisplayObject;
        private colorFilter: egret.ColorMatrixFilter;
        private tempColor = new Color();

        public constructor() {
            super();
            this.currentMesh = new egret.Mesh()
            this.addChild(this.currentMesh)
        }

        public getRegionTexture(region: TextureAtlasRegion) {
            let sheet = (region.texture as AdapterTexture).spriteSheet;
            return sheet.$texture
        }

        public renderSlot(slot: Slot, skeleton: Skeleton, colored: boolean) {
            let bone = slot.bone;
            let attachment = slot.getAttachment();
            let texture: egret.Texture = null;
            let region: TextureAtlasRegion = null;
            let clipper = SkeletonRenderer.clipper;

            let numFloats = 0;


            if (slot.data.blendMode == BlendMode.Additive) {
                this.blendMode = egret.BlendMode.ADD;
            }
            else {
                this.blendMode = egret.BlendMode.NORMAL;
            }

            let vertices: ArrayLike<number> = SkeletonRenderer.vertices;
            let triangles: Array<number> = null;

            let currentName = this.currentMesh ? this.currentMesh.name : '';
            let attachmentColor = new Color()
            let vertexSize = clipper.isClipping() ? 2 : SkeletonRenderer.VERTEX_SIZE;
            let regionName = attachment ? attachment.name : '';
            if (attachment instanceof RegionAttachment) {
                this.visible = true;
                let regionAttachment = <RegionAttachment>attachment;
                vertices = this.computeRegionVertices(slot, regionAttachment, false);
                triangles = SkeletonRenderer.QUAD_TRIANGLES;
                region = <TextureAtlasRegion>regionAttachment.region;
                attachmentColor = attachment.color
                numFloats = vertexSize * 4;
                texture = this.getRegionTexture(attachment.region as TextureAtlasRegion)

            } else if (attachment instanceof MeshAttachment) {
                this.visible = true;
                let mesh = <MeshAttachment>attachment;
                vertices = this.computeMeshVertices(slot, mesh, false);
                triangles = mesh.triangles;
                region = <TextureAtlasRegion>mesh.region;
                attachmentColor = attachment.color
                numFloats = (mesh.worldVerticesLength >> 1) * vertexSize;
                texture = this.getRegionTexture(attachment.region as TextureAtlasRegion)

            } else {
                this.visible = false;
            }

            if (texture != null) {
                //准备开始渲染
                let skeleton = slot.bone.skeleton;
                let skeletonColor = skeleton.color;
                let slotColor = slot.color;

                let alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
                let color = this.tempColor;
                color.set(skeletonColor.r * slotColor.r * attachmentColor.r,
                    skeletonColor.g * slotColor.g * attachmentColor.g,
                    skeletonColor.b * slotColor.b * attachmentColor.b,
                    alpha);

                if (color.r != 1 || color.g != 1 || color.b != 1 || color.a != 1) {
                    this.alpha = color.a
                }

                let npos = []
                let nuvs = []
                let ncolors = []
                let nindices = []
                let j = 0;

                let finalVerticesLength = numFloats
                let finalIndicesLength = triangles.length
                let finalIndices = triangles
                let finalVertices = vertices
                if (clipper.isClipping()) {
                    console.log("isClipping == ",attachment.name)
                    finalVerticesLength = clipper.clippedVertices.length
                    finalIndicesLength = clipper.clippedTriangles.length
                    finalIndices = clipper.clippedTriangles
                    finalVertices = clipper.clippedVertices
                }

                for (; j < finalVerticesLength;) {
                    npos.push(finalVertices[j++]);
                    npos.push(finalVertices[j++]);


                    ncolors.push(vertices[j++]);
                    ncolors.push(vertices[j++]);
                    ncolors.push(vertices[j++]);
                    ncolors.push(vertices[j++]);

                    nuvs.push(vertices[j++]);
                    nuvs.push(vertices[j++]);
                }
                for (j = 0; j < finalIndicesLength; j++) {
                    nindices.push(finalIndices[j])
                }

                if (region) {
                    //console.log("renderer.name=", attachment.name, color)
                    this.visible = true
                    this.drawMesh(texture, nuvs, npos, nindices, color)
                    this.currentMesh.visible = true
                }
                else {
                    this.visible = false
                }
            }

            clipper.clipEndWithSlot(slot);
        }

        private drawMesh(texture: egret.Texture, uvs, vertices, indices, color: Color) {
            let meshObj = this.currentMesh as egret.Mesh
            const meshNode = meshObj.$renderNode as egret.sys.MeshNode;
            meshNode.uvs.length = uvs.length
            meshNode.vertices.length = vertices.length
            meshNode.indices.length = indices.length

            meshNode.uvs = uvs

            for (let i = 0; i < vertices.length; ++i) {
                meshNode.vertices[i] = vertices[i]
            }
            //meshNode.vertices = npos
            meshNode.indices = indices

            meshNode.image = texture.bitmapData;

            meshNode.drawMesh(
                texture.$bitmapX, texture.$bitmapY,
                texture.$bitmapWidth, texture.$bitmapHeight,
                texture.$offsetX, texture.$offsetY,
                texture.textureWidth, texture.textureHeight
            );
            meshNode.imageWidth = texture.$sourceWidth;
            meshNode.imageHeight = texture.$sourceHeight;

            //color.setFromString()
            //color.clamp()
            meshObj.texture = texture

            
            //使用 filters drawcall 很高
            if (color.r != 1 || color.g != 1 || color.b != 1 || color.a != 1) {

                var colorMatrix = [
                    color.r, 0, 0, 0, 0,
                    0, color.g, 0, 0, 0,
                    0, 0, color.b, 0, 0,
                    0, 0, 0, color.a, 0
                ];
                var colorFlilter = new egret.ColorMatrixFilter(colorMatrix);
                meshObj.filters = [colorFlilter];
            }

            // let hex = this.colorHex(color)
            // console.log("hex=", hex)
            // meshObj.tint = hex//0x4169E1
            meshObj.$updateVertices();
        }
        private colorHex(color: Color) {
            var strHex = "0x";
            let rgb = [color.r, color.g, color.b]

            for (var i = 0; i < rgb.length; i++) {
                var hex = Number(Math.floor(rgb[i] * 255)).toString(16);
                if (hex.length < 2) {
                    hex = '0' + hex;
                }
                strHex += hex;
            }
            if (strHex.length !== 8) {
                strHex = "0xFFFFFF";
            }
            //console.log("Number(strHex)",Number(strHex),strHex)
            return Number(strHex);
        }
        private createMesh(region: TextureAtlasRegion) {
            let mesh = new egret.Mesh()
            mesh.name = region.name
            this.addChild(mesh)
            return mesh
        }

        private computeRegionVertices(slot: Slot, region: RegionAttachment, pma: boolean) {
            let skeleton = slot.bone.skeleton;
            let skeletonColor = skeleton.color;
            let slotColor = slot.color;
            let regionColor = region.color;
            let alpha = skeletonColor.a * slotColor.a * regionColor.a;
            let multiplier = pma ? alpha : 1;
            let color = this.tempColor;
            color.set(skeletonColor.r * slotColor.r * regionColor.r * multiplier,
                skeletonColor.g * slotColor.g * regionColor.g * multiplier,
                skeletonColor.b * slotColor.b * regionColor.b * multiplier,
                alpha);

            region.computeWorldVertices(slot.bone, SkeletonRenderer.vertices, 0, SkeletonRenderer.VERTEX_SIZE);

            let vertices = SkeletonRenderer.vertices;
            let uvs = region.uvs;

            vertices[RegionAttachment.C1R] = color.r;
            vertices[RegionAttachment.C1G] = color.g;
            vertices[RegionAttachment.C1B] = color.b;
            vertices[RegionAttachment.C1A] = color.a;
            vertices[RegionAttachment.U1] = uvs[0];
            vertices[RegionAttachment.V1] = uvs[1];

            vertices[RegionAttachment.C2R] = color.r;
            vertices[RegionAttachment.C2G] = color.g;
            vertices[RegionAttachment.C2B] = color.b;
            vertices[RegionAttachment.C2A] = color.a;
            vertices[RegionAttachment.U2] = uvs[2];
            vertices[RegionAttachment.V2] = uvs[3];

            vertices[RegionAttachment.C3R] = color.r;
            vertices[RegionAttachment.C3G] = color.g;
            vertices[RegionAttachment.C3B] = color.b;
            vertices[RegionAttachment.C3A] = color.a;
            vertices[RegionAttachment.U3] = uvs[4];
            vertices[RegionAttachment.V3] = uvs[5];

            vertices[RegionAttachment.C4R] = color.r;
            vertices[RegionAttachment.C4G] = color.g;
            vertices[RegionAttachment.C4B] = color.b;
            vertices[RegionAttachment.C4A] = color.a;
            vertices[RegionAttachment.U4] = uvs[6];
            vertices[RegionAttachment.V4] = uvs[7];

            return vertices;
        }

        private computeMeshVertices(slot: Slot, mesh: MeshAttachment, pma: boolean) {
            let skeleton = slot.bone.skeleton;
            let skeletonColor = skeleton.color;
            let slotColor = slot.color;
            let regionColor = mesh.color;
            let alpha = skeletonColor.a * slotColor.a * regionColor.a;
            let multiplier = pma ? alpha : 1;
            let color = this.tempColor;
            color.set(skeletonColor.r * slotColor.r * regionColor.r * multiplier,
                skeletonColor.g * slotColor.g * regionColor.g * multiplier,
                skeletonColor.b * slotColor.b * regionColor.b * multiplier,
                alpha);

            let numVertices = mesh.worldVerticesLength / 2;
            if (SkeletonRenderer.vertices.length < mesh.worldVerticesLength) {
                SkeletonRenderer.vertices = Utils.newFloatArray(mesh.worldVerticesLength);
            }
            let vertices = SkeletonRenderer.vertices;
            mesh.computeWorldVertices(slot, 0, mesh.worldVerticesLength, vertices, 0, SkeletonRenderer.VERTEX_SIZE);

            let uvs = mesh.uvs;
            for (let i = 0, n = numVertices, u = 0, v = 2; i < n; i++) {
                vertices[v++] = color.r;
                vertices[v++] = color.g;
                vertices[v++] = color.b;
                vertices[v++] = color.a;
                vertices[v++] = uvs[u++];
                vertices[v++] = uvs[u++];
                v += 2;
            }

            return vertices;
        }

        private createSprite(attachment: RegionAttachment, region: TextureAtlasRegion) {
            let sheet = (region.texture as AdapterTexture).spriteSheet;
            let texture = sheet.getTexture(region.name) || region.rotate
                ? sheet.createTexture(
                    region.name,
                    region.x, region.y,
                    region.height, region.width,
                    region.offsetX, region.offsetY,
                    region.originalHeight, region.originalWidth
                )
                : sheet.createTexture(
                    region.name,
                    region.x, region.y,
                    region.width, region.height,
                    region.offsetX, region.offsetY,
                    region.originalWidth, region.originalHeight
                );
            let sprite = new egret.Bitmap(texture);

            sprite.name = region.name;
            sprite.x = attachment.x;
            sprite.y = attachment.y;
            sprite.anchorOffsetX = 0.5 * sprite.width;
            sprite.anchorOffsetY = 0.5 * sprite.height;
            sprite.scaleX = attachment.scaleX * (attachment.width / region.width);
            sprite.scaleY = -attachment.scaleY * (attachment.height / region.height);
            sprite.rotation = attachment.rotation;
            if (region.rotate) {
                sprite.rotation -= 90;
            }
            this.addChild(sprite);

            return sprite;
        }
    }
}
