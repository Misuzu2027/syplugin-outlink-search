
# 出链搜索

获取当前打开文档中的所有思源块出链，默认查询范围：块引用、超链接（`siyuan://blocks/` 开头）、数据库当前视图的所有主键。

支持设置查询深度，1级就是当前文档的出链，2级就是当前文档出链文档（如果引用的不是文档，则是子块）中的出链；以此类推。不过需要注意，每多一层深度，就需要多一次查询，速度会降低，建议开启缓存。

支持关键字搜索，查询范围会限制在出链块及其子块中。

### 默认快捷键

* `Shift + Alt + O` ： 显示隐藏“出链搜索Dock”
* `Ctrl + Shift + Alt + O` ：打开当前文档的“出链搜索页签”

