# spine-egret-runtimes

## About

> 本项目为 白鹭  的 spine 运行库
> A spine runtime for Egret  
> Demo:https://www.bobsong.net/spine-egret-runtimes-example/.

## Preview
![img](https://github.com/BobSongCN/spine-egret-runtimes/blob/master/preview.png)

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

## 参考
> https://github.com/fightingcat/egret-spine
本库再上诉库基础上修改的

## Blog
> https://www.bobsong.net

## Issues

- 未叠加颜色
- 裁剪未完成
