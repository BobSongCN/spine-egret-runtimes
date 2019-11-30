# spine-egret-runtimes

## About

> 本项目为 白鹭  的 spine 运行库
> A spine runtime for Egret  
> Demo:https://www.bobsong.net/spine-egret-runtimes-example/.

## Preview
![img](https://bobsongblog.oss-cn-hangzhou.aliyuncs.com/www_bobsong_net/usr/uploads/2019/11/1734530915.png)

## Installing
> See [Egret document](http://developer.egret.com/cn/github/egret-docs/Engine2D/projectConfig/libraryProject/index.html) for integrating to Egret project.

## Getting started

```
private loadSpineAnimation(skeletonName: string) {

    let json = RES.getRes(skeletonName + "_json")
    let atlas = RES.getRes(skeletonName + "_atlas")
    let imgs = {
        [skeletonName + '.png']: RES.getRes(skeletonName + "_png")
    }
    for (var i = 2; i < 5; i++) {
        let img = RES.getRes(skeletonName+i + "_png")
        if(img != null)
        {
            imgs[skeletonName+i + '.png'] = img
        }
        else
        {
            break;
        }
    }

    let texAtlas = spine.createTextureAtlas(atlas, imgs);
    let skelData = spine.createSkeletonData(json, texAtlas);

    return new spine.SkeletonAnimation(skelData);
}
```

## Learn more
Several classes or structures have been added, all be declared within namespace spine to minimize impact.
- `createSkeletonData`  Helper for creating skeleton data.
- `createTextureAtlas` Helper for creating texture atlas.
- `SkeletonAnimation` A user-friendly animation manager.
- `SkeletonRenderer` A mere skeleton renderer
- `SlotRenderer` Slot renderer for SkeletonRenderer.
- `EventEmitter` Embbeded implemation of event emitter.
- `SpineEvent` Enums of animation events.
- `Track` Track abstraction for SkeletonAnimation.

## Blog
> https://www.bobsong.net

## Issues

- 未叠加颜色
- 裁剪未完成
