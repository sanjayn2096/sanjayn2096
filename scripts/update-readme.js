const fs = require("fs");

const username = "sanjayn2096";

const ignoredRepos = new Set([
  "RecipeAI",
  "myfirstapp",
  "sensor-record",
  "sanjayn2096",
]);

const start = "<!-- REPOS:START -->";
const end = "<!-- REPOS:END -->";

function shouldIgnore(repo) {
  return repo.fork || repo.archived || repo.private || ignoredRepos.has(repo.name);
}

async function fetchRepos(page = 1) {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "profile-readme-updater",
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchAllRepos() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await fetchRepos(page);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

function formatRepo(repo) {
  const description = repo.description?.trim() || "No description yet.";
  const language = repo.language ? ` · ${repo.language}` : "";
  return `- [${repo.name}](${repo.html_url}) — ${description}${language}`;
}

async function main() {
  const repos = await fetchAllRepos();
  const repoMarkdown = repos
    .filter((repo) => !shouldIgnore(repo))
    .map(formatRepo)
    .join("\n");

  const readmePath = "README.md";
  const readme = fs.readFileSync(readmePath, "utf8");

  if (!readme.includes(start) || !readme.includes(end)) {
    throw new Error(`README.md must include ${start} and ${end} markers.`);
  }

  const updated = readme.replace(
    new RegExp(`${start}[\\s\\S]*?${end}`),
    `${start}\n${repoMarkdown}\n${end}`
  );

  fs.writeFileSync(readmePath, updated);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
