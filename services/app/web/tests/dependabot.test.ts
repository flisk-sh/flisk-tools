import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
        generateDependabotConfig,
        serviceDirectories,
} from "../scripts/dependabot-config";

const root = join(import.meta.dir, "../../../..");
const configPath = join(root, ".github/dependabot.yml");
const content = readFileSync(configPath, "utf8");

function getUpdateDirectories(ecosystem: string): (string | undefined)[] {
        const entries = content.split(/(?=^\s*-\s*package-ecosystem:)/m);

        return entries
                .filter((entry) =>
                        new RegExp(
                                `^\\s*-\\s*package-ecosystem:\\s*${ecosystem}\\s*$`,
                                "m",
                        ).test(entry),
                )
                .map((entry) =>
                        entry.match(/^\s+directory:\s*(\S+)\s*$/m)?.[1],
                );
}

describe("Dependabot configuration", () => {
        const bunDirectories = getUpdateDirectories("bun");
        const dockerDirectories = getUpdateDirectories("docker");

        it("matches the generated configuration", () => {
                expect(content).toBe(generateDependabotConfig());
        });

        it("uses the configured service directories for Bun and Docker", () => {
                expect(bunDirectories).toEqual(serviceDirectories);
                expect(dockerDirectories).toEqual(serviceDirectories);
        });

        it("every Docker update directory contains a Dockerfile", () => {
                for (const directory of dockerDirectories) {
                        expect(directory).toBeDefined();

                        if (!directory) continue;

                        const relativeDirectory = directory.replace(/^\/+/, "");
                        const dockerfilePath = join(
                                root,
                                relativeDirectory,
                                "Dockerfile",
                        );

                        expect(
                                existsSync(dockerfilePath),
                                `Dockerfile missing in Dependabot directory: ${directory}`,
                        ).toBe(true);
                }
        });
});