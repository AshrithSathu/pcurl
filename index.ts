#!/usr/bin/env bun
import axios from "axios";
import { highlight } from "cli-highlight";
import chalk from "chalk";
import { Command } from "commander";
import https from "https";

const program = new Command();

// Helper to collect repeated options (like -H)
function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}

program
  .name("pcurl")
  .description("A curl-like tool with pretty JSON formatting")
  .argument("<url>", "The URL to request")
  .option("-X, --request <method>", "HTTP method (GET, POST, etc.)", "GET")
  .option("-H, --header <header>", "HTTP headers", collect, [])
  .option("-d, --data <data>", "HTTP request body data")
  .option("--data-raw <data>", "HTTP request body data (alias for -d)")
  .option("--data-binary <data>", "HTTP request body data (alias for -d)")
  .option("-u, --user <user:password>", "Server user and password")
  .option("-k, --insecure", "Allow insecure server connections when using SSL")
  .option("-i, --include", "Include protocol response headers in the output")
  .option("-L, --location", "Follow redirects (enabled by default in pcurl)")
  .option(
    "--compressed",
    "Request compressed response (enabled by default in pcurl)",
  )
  .option("-s, --silent", "Silent mode") // Ignored, just for compatibility
  .action(async (url, options, command) => {
    try {
      const headers: Record<string, string> = {};

      // Parse headers from array of strings "Key: Value"
      if (options.header) {
        options.header.forEach((h: string) => {
          const [key, ...valueParts] = h.split(":");
          if (key && valueParts.length > 0) {
            headers[key.trim()] = valueParts.join(":").trim();
          }
        });
      }

      // Handle Data (unify -d, --data-raw, --data-binary)
      const data = options.data || options.dataRaw || options.dataBinary;

      let method = options.request;

      // Automatically add Content-Type: application/json if data is present and not specified
      if (data && !headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }

      // Handle Basic Auth
      let auth = undefined;
      if (options.user) {
        const [username, password] = options.user.split(":");
        auth = { username, password };
      }

      // Handle Insecure SSL
      const httpsAgent = new https.Agent({
        rejectUnauthorized: !options.insecure,
      });

      const config: any = {
        method: method,
        url: url,
        headers: headers,
        data: data,
        auth: auth,
        httpsAgent: httpsAgent,
        validateStatus: () => true, // Accept all status codes
      };

      const response = await axios(config);

      // --- Output Handling ---

      // 1. Print Headers if -i is set
      if (options.include) {
        const statusLine = `HTTP/${response.request.protocol?.split(":")[1] || "1.1"} ${response.status} ${response.statusText}`;
        console.log(chalk.blue(statusLine));
        for (const [key, val] of Object.entries(response.headers)) {
          console.log(chalk.cyan(`${key}: ${val}`));
        }
        console.log(""); // Empty line between headers and body
      }

      if (response.status >= 400 && !options.silent) {
        console.warn(
          chalk.yellow(
            `Warning: Request failed with status ${response.status} ${response.statusText}`,
          ),
        );
      }

      // 2. Print Body (Pretty JSON)
      const contentType = response.headers["content-type"];
      const isJsonHeader =
        contentType && contentType.includes("application/json");

      if (typeof response.data === "object" && response.data !== null) {
        const formatted = JSON.stringify(response.data, null, 2);
        console.log(
          highlight(formatted, { language: "json", ignoreIllegals: true }),
        );
      } else if (isJsonHeader) {
        try {
          const json = JSON.parse(response.data);
          const formatted = JSON.stringify(json, null, 2);
          console.log(
            highlight(formatted, { language: "json", ignoreIllegals: true }),
          );
        } catch (e) {
          console.log(response.data);
        }
      } else {
        console.log(response.data);
      }
    } catch (error: any) {
      if (options.silent) process.exit(1);

      if (error.response) {
        console.error(
          chalk.red(
            `Error: ${error.response.status} ${error.response.statusText}`,
          ),
        );
      } else if (error.request) {
        console.error(chalk.red("Error: No response received from server."));
      } else {
        console.error(chalk.red("Error:"), error.message);
      }
      process.exit(1);
    }
  });

// Allow unknown options so we don't crash on obscure curl flags
program.allowUnknownOption();

program.parse(process.argv);
