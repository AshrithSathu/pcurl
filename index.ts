#!/usr/bin/env bun
import axios from "axios";
import { highlight } from "cli-highlight";
import chalk from "chalk";
import { Command } from "commander";

const program = new Command();

program
  .name("pcurl")
  .description("A curl-like tool with pretty JSON formatting")
  .argument("<url>", "The URL to request")
  .option("-X, --request <method>", "HTTP method (GET, POST, etc.)", "GET")
  .option("-H, --header <header...>", "HTTP headers")
  .option("-d, --data <data>", "HTTP request body data")
  .action(async (url, options) => {
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

      // Automatically add Content-Type: application/json if data is present and not specified
      if (
        options.data &&
        !headers["Content-Type"] &&
        !headers["content-type"]
      ) {
        headers["Content-Type"] = "application/json";
      }

      const config = {
        method: options.request,
        url: url,
        headers: headers,
        data: options.data,
        validateStatus: () => true, // Accept all status codes
      };

      const response = await axios(config);

      if (response.status >= 400) {
        console.warn(
          chalk.yellow(
            `Warning: Request failed with status ${response.status} ${response.statusText}`,
          ),
        );
      }

      // Check content-type header to see if it's JSON
      const contentType = response.headers["content-type"];
      const isJsonHeader =
        contentType && contentType.includes("application/json");

      // Axios automatically tries to parse JSON.
      // If response.data is an object, it's likely JSON.
      if (typeof response.data === "object" && response.data !== null) {
        const formatted = JSON.stringify(response.data, null, 2);
        console.log(
          highlight(formatted, { language: "json", ignoreIllegals: true }),
        );
      } else if (isJsonHeader) {
        // It says it's JSON but Axios might have returned a string (malformed?) or it's just a string.
        // Try to parse it manually if it's a string
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
        // Not JSON, just print raw
        console.log(response.data);
      }
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx (but we handle this with validateStatus usually)
        console.error(
          chalk.red(
            `Error: ${error.response.status} ${error.response.statusText}`,
          ),
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error(chalk.red("Error: No response received from server."));
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(chalk.red("Error:"), error.message);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
