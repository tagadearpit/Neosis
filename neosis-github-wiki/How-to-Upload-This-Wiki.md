# How to Upload This Wiki

GitHub Wikis are stored as a separate Git repository. The easiest way to upload these pages is through Git.

## 1. Enable Wiki in GitHub

1. Open your GitHub repository.
2. Go to **Settings**.
3. Scroll to **Features**.
4. Enable **Wikis**.
5. Open the **Wiki** tab once so GitHub initializes it.

## 2. Clone the Wiki repository

Use this format:

```bash
git clone https://github.com/<your-username>/<your-repo>.wiki.git
```

Example:

```bash
git clone https://github.com/tagadearpit/Neosis.wiki.git
```

If your repository name is different, replace `Neosis` with the exact repository name.

## 3. Copy the generated Markdown files

Extract `neosis-github-wiki.zip`, then copy all `.md` files into the cloned `.wiki` folder.

Example:

```bash
cp -r neosis-github-wiki/*.md Neosis.wiki/
```

On Windows PowerShell:

```powershell
Copy-Item .\neosis-github-wiki\*.md .\Neosis.wiki\ -Force
```

## 4. Commit and push

```bash
cd Neosis.wiki
git add .
git commit -m "Add Neosis project wiki"
git push
```

## 5. Verify

Open the **Wiki** tab in GitHub. `Home.md` should appear as the landing page, and `_Sidebar.md` should appear as the navigation sidebar.

## Notes

- GitHub Wiki page titles are generated from file names.
- `Project-Overview.md` appears as `Project Overview`.
- `_Sidebar.md` controls the sidebar.
- `_Footer.md` controls the footer.
- Keep secrets out of wiki pages.
