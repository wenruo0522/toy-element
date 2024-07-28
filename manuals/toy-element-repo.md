# 项目搭建

## 项目初始化

```sh
mkdir toy-element
cd toy-element
git init
```

`monorepo` 项目，需要配置 `pnpm-workspace.yaml` 文件并初始化。

```sh
mkdir packages
echo -e 'packages:\n  - "packages/*"' > pnpm-workspace.yaml
pnpm init
```

配置 `.gitignore`

```sh
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
coverage
dist
dist-ssr
*.local

/cyperss/videos/
/cypress/srceenshots/

.vitepress/dist
.vitepress/cache

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

目录结构采用扁平化处理，整个仓库只有 `packages` 一个工作区，项目的分包结构如下：

```sh
- components # 组件目录
- core # npm 包入口
- docs # 文档目录
- hooks # 组合式API hooks 目录
- play # 组件开发实验室
- theme # 主题目录
- utils # 工具函数目录
```

在 `packages` 目录下创建 `init.shell` 并执行该脚本

```sh
for i in components core docs hooks theme utils; do
  mkdir $i
  cd $i
  pnpm init
  cd ..
done
```

利用 `vite` 创建 `play` 的 `Vue` 项目

```sh
pnpm create vite play --template vue-ts
```

修改 `packages` 对应子包 `package.json` 中的 `name` 字段。

## 安装基础依赖

```sh
pnpm add -Dw typescript@^5.2.2 vite@^5.1.4 vitest@^1.4.0 vue-tsc@^1.8.27 postcss-color-mix@^1.1.0 postcss-each@^1.1.0 postcss-each-variables@^0.3.0 postcss-for@^2.1.1 postcss-nested@^6.0.1 @types/node@^20.11.20 @types/lodash-es@^4.17.12 @vitejs/plugin-vue@^5.0.4 @vitejs/plugin-vue-jsx@^3.1.0 @vue/tsconfig@^0.5.1

pnpm add -w lodash-es@^4.17.21 vue@^3.4.19
```

在根目录 `package.json` 中添加如下内容：

```sh
{
  "dependencies": {
    "toy-element": "workspace:*",
    "@toy-element/hooks": "workspace:*",
    "@toy-element/utils": "workspace:*",
    "@toy-element/theme": "workspace:*"
  }
}
```

添加分包中对应的依赖：

- `components`

  ```sh
  pnpm add -D @vue/test-utils@^2.4.5 @vitest/coverage-v8@^1.4.0 jsdom@^24.0.0 --filter @toy-element/components
  pnpm add @popperjs/core@^2.11.8 async-validator@^4.2.5 --filter @toy-element/components
  ```

- `core`

  在 `core/package.json` 中添加如下内容

  ```sh
  {
    "dependencies": {
      "@toy-element/components": "workspace:*"
    }
  }
  ```

- `docs`

  ```sh
  pnpm add -D vitepress@1.0.0-rc.44 --filter @toy-element/docs
  ```

- `play`

  将 `play/package.json` 中冗余部分删除。

## 创建分包入口

首先在根目录创建一些必要的配置文件。

`postcss.config.cjs`

```sh
/* eslint-env node */
module.exports = {
  plugins: [
    require("postcss-nested"),
    require("postcss-each-variables"),
    require("postcss-each")({
      plugins: {
        beforeEach: [require("postcss-for"), require("postcss-color-mix")],
      },
    }),
  ],
};
```

`tsconfig.json`

```sh
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "jsxImportSource": "vue",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["packages/**/*.ts", "packages/**/*.tsx", "packages/**/*.vue"]
}
```

`tsconfig.node.json`

```sh
{
  "extends": "@tsconfig/node18/tsconfig.json",
  "include": ["packages/**/**.config.ts"],
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  }
}
```

- `components`

  创建 `index.ts` 以及第一个 `Button` 组件目录，创建最基础的 `vue sfc`

  ```sh
  <template>
    <button style="color:red;">test button</button>
  </template>
  ```

  并在 `Button` 目录中创建入口 `index.ts` 导出 `Button` 组件，并在 `components/index.ts` 中导出组件并将 `package.json` 中的入口改为 `index.ts`

  > 组件库项目的每个组件目录大致如下：
  >
  > ```sh
  > - Xxx.test.tsx
  > - Xxx.vue
  > - types.ts
  > - style.css
  > - index.ts
  > - * constants.ts
  > ```

- `core`

  创建 `index.ts` 和 `components.ts` 

  ```sh
  // components.ts
  
  import { ErButton } from "@toy-element/components";
  import type { Plugin } from "vue";
  
  export default [ErButton] as Plugin[];
  ```

  创建第一个 `utils` 文件 `install.ts` 用于 `vue plugin` 安装的一系列操作：

  ```sh
  import type { App, Plugin } from "vue";
  import { each } from "lodash-es";
  
  type SFCWithInstall<T> = T & Plugin;
  
  export function makeInstaller(components: Plugin[]) {
    const install = (app: App) =>
      each(components, (c) => {
        app.use(c);
      });
  
    return install;
  }
  
  export const withInstall = <T>(component: T) => {
    (component as SFCWithInstall<T>).install = (app: App) => {
      const name = (component as any)?.name || "UnnamedComponent";
      app.component(name, component as SFCWithInstall<T>);
    };
    return component as SFCWithInstall<T>;
  };
  ```

  在 `core/index.ts` 中导出我们的 `components` 并修改 `package.json` 中入口为 `index.ts`

  ```sh
  import { makeInstaller } from "@toy-element/utils";
  import components from "./components";
  
  const installer = makeInstaller(components);
  
  export * from "@toy-element/components";
  export default installer;
  ```

- `theme` 创建`index.css` `reset.css` 在 `theme/index.css` 中导入 `reset.css`

    ```sh
    /** reset.css */
    body {
      font-family: var(--er-font-family);
      font-weight: 400;
      font-size: var(--er-font-size-base);
      line-height: calc(var(--er-font-size-base) * 1.2);
      color: var(--er-text-color-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-tap-highlight-color: transparent;
    }
    
    a {
      color: var(--er-color-primary);
      text-decoration: none;
    
      &:hover,
      &:focus {
        color: var(--er-color-primary-light-3);
      }
    
      &:active {
        color: var(--er-color-primary-dark-2);
      }
    }
    
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      color: var(--er-text-color-regular);
      font-weight: inherit;
    
      &:first-child {
        margin-top: 0;
      }
    
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    h1 {
      font-size: calc(var(--er-font-size-base) + 6px);
    }
    
    h2 {
      font-size: calc(var(--er-font-size-base) + 4px);
    }
    
    h3 {
      font-size: calc(var(--er-font-size-base) + 2px);
    }
    
    h4,
    h5,
    h6,
    p {
      font-size: inherit;
    }
    
    p {
      line-height: 1.8;
    
      &:first-child {
        margin-top: 0;
      }
    
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    sup,
    sub {
      font-size: calc(var(--er-font-size-base) - 1px);
    }
    
    small {
      font-size: calc(var(--er-font-size-base) - 2px);
    }
    
    hr {
      margin-top: 20px;
      margin-bottom: 20px;
      border: 0;
      border-top: 1px solid var(--er-border-color-lighter);
    }
    ```
    
    ```sh
    /*** index.css ***/
    @import "./reset.css"
    ```
    
    修改 `package.json` 中的入口为 `index.css` 在 `core\index.ts` 中导入 `theme`
    
- 创建`Vitepress`文档 [官方文档](https://vitepress.dev/zh/guide/getting-started)

    ```sh
    npx vitepress init
    ```

## 脚本与部署

- 创建脚本并测试

  ```sh
  {
    "scripts": {
      "dev": "pnpm --filter @toy-element/play dev",
      "docs:dev": "pnpm --filter @toy-element/docs dev",
      "docs:build": "pnpm --filter @toy-element/docs build",
      "test": "echo \"todo\""
    }
  }
  ```

- 创建远程仓库并关联

- 项目部署，创建 `.github/workflows/test-and-deploy.yml` 文件并需要在`github`仓库中设置`secrets`

  ```sh
  name: Test and deploy
  
  on:
    push:
      branches:
        - master
  
  jobs:
    test:
      name: Run Lint and Test
      runs-on: ubuntu-latest
  
      steps:
        - name: Checkout repo
          uses: actions/checkout@v3
  
        - name: Setup Node
          uses: actions/setup-node@v3
  
        - name: Install pnpm 
          run: npm install -g pnpm
  
        - name: Install dependencies
          run: pnpm install --frozen-lockfile
  
        - name: Run tests
          run: npm run test
  
    build:
      name: Build docs
      runs-on: ubuntu-latest
      needs: test
  
      steps:
        - name: Checkout repo
          uses: actions/checkout@v3
  
        - name: Setup Node
          uses: actions/setup-node@v3
  
        - name: Install pnpm
          run: npm install -g pnpm
  
        - name: Install dependencies
          run: pnpm install --frozen-lockfile
  
        - name: Build docs
          run: npm run docs:build
  
        - name: Upload docs
          uses: actions/upload-artifact@v3
          with:
            name: docs
            path: ./packages/docs/.vitepress/dist
  
    deploy:
      name: Deploy to GitHub Pages
      runs-on: ubuntu-latest
      needs: build
      steps:
        - name: Download docs
          uses: actions/download-artifact@v3
          with:
            name: docs
  
        - name: Deploy to GitHub Pages
          uses: peaceiris/actions-gh-pages@v3
          with:
            github_token: ${{ secrets.GH_TOKEN }}
            publish_dir: .
  ```

  
