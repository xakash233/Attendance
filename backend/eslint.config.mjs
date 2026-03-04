import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            }
        },
        rules: {
            "no-unused-vars": ["warn", {
                "argsIgnorePattern": "^(req|res|next|tx|err|_|promise|settings)$",
                "varsIgnorePattern": "^(pendingUser|mailError|updatedSyncLog|auditService|authorize|response|result|leaveRequest|overlapping|usersRes|deptsRes|stats|recentActivity|recentLeaves|notifications|parsedUser|isSuperAdminRoute|notifyRole)$",
                "caughtErrors": "none"
            }],
            "no-console": "off",
        }
    }
];
