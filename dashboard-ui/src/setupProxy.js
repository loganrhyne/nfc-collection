// Optional development-only archive source. CRA does not bundle this server file.
// Keep private photos outside public/ so production builds never copy them.
const path = require("path");
module.exports = function setupArchivePreview(app) {
  const archive = process.env.STRATA_ARCHIVE_DIR;
  if (!archive) return;
  const root = path.resolve(archive);
  app.get("/data/journal.json", (_request, response) =>
    response.sendFile(process.env.STRATA_JOURNAL_FILE || "journal.json", {
      root,
    }),
  );
  app.get("/data/:kind/:file", (request, response, next) => {
    const { kind, file } = request.params;
    if (
      !["photos", "videos", "pdfs"].includes(kind) ||
      path.basename(file) !== file
    )
      return next();
    response.sendFile(file, { root: path.join(root, kind) });
  });
};
