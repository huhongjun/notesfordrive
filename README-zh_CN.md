Notes for Google Drive
=============

Chrome扩展 - 创建和保存笔记为Google Drive中的文档。

[去Chrome应用商店中查看插件](https://chrome.google.com/webstore/detail/notes-for-google-drive/ndidogegapfaolpcebadjknkdlladffa)

**功能**
- 简介、现代的UI
- 扩展启动时加载文档
- 文档发生变化时，自动与Google Drive同步(即：当你输入的时候)
- 自动提取第一行作为笔记标题
- 文档也可以在Google Drive中编辑和协同编辑，具有全部Google Drive带来的优势
- 笔记可拖拽排序

**Built on**
- jquery
- jquery-ui
- moment.js
- Bootstrap
- Google Drive REST API
- Summernote

**Authentication**

OAuth2使用一个修改版本，来自[borismus](https://github.com/borismus/oauth2-extensions)，可让插件使用与Chrome不同的Google帐户。

The Chrome identity API largely makes the need for directly interacting with the OAuth2 API a thing of the past, however it requires users to be logged into their Chrome browser, which may not be ideal when they have both personal and work credentials. Using the OAuth API directly allows users to be logged into whichever Google Docs account they wish.

Borismus' implementation contained a few issues around refresh tokens, was overly complex in the way it handled the redirect calls (content injection scripts etc) and didn't contain callbacks for failed states - these problems have been resolved.
