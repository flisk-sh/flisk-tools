import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../../..");

// Maintain service directories in this single list.
export const serviceDirectories = ["/services/app/web"];

export function generateDependabotConfig(): string {
        const updates = serviceDirectories.flatMap((directory) =>
                ["bun", "docker"].map(
                        (ecosystem) => `  - package-ecosystem: ${ecosystem}
    directory: ${directory}
    schedule:
      interval: weekly`,
                ),
        );

        updates.push(`  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly`);

        return `version: 2
updates:
${updates.join("\n")}
`;
}

if (import.meta.main) {
        const configPath = join(root, ".github/dependabot.yml");
        writeFileSync(configPath, generateDependabotConfig());
        console.log("Dependabot configuration generated successfully.");
}