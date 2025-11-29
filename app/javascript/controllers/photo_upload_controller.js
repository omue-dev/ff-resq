import { Controller } from "@hotwired/stimulus"

/**
 * PhotoUploadController
 * ---------------------
 * Manages photo selection UX: shows file name/size, toggles preview state,
 * and allows clearing the selection.
 *
 * Targets:
 * - input: file input element.
 * - preview: container that is shown/hidden when a file is selected.
 * - fileName: text node to display the selected file name.
 * - fileSize: text node to display the selected file size in KB.
 */
export default class extends Controller {
  static targets = ["input", "preview", "fileName", "fileSize"]

  /**
   * Handle file selection and display preview metadata.
   *
   * @param {Event} event - change event from the file input
   * @returns {void}
   */
  handleFileSelect(event) {
    const file = event.target.files[0]
    if (file) {
      this.showPreview(file)
    } else {
      this.hidePreview()
    }
  }

  /**
   * Display the preview UI with file information.
   *
   * @param {File} file - selected file
   * @returns {void}
   */
  showPreview(file) {
    if (!this.hasPreviewTarget) return

    if (this.hasFileNameTarget) {
      this.fileNameTarget.textContent = file.name
    }

    if (this.hasFileSizeTarget) {
      this.fileSizeTarget.textContent = this.formatFileSizeKB(file.size)
    }

    this.previewTarget.classList.add('active')
  }

  /**
   * Hide the preview UI.
   * @returns {void}
   */
  hidePreview() {
    if (!this.hasPreviewTarget) return
    this.previewTarget.classList.remove('active')
  }

  /**
   * Clear the selected file and hide preview.
   * @returns {void}
   */
  clearFile() {
    if (this.hasInputTarget) {
      this.inputTarget.value = ''
    }
    this.hidePreview()
  }

  /**
   * Format file size in KB with one decimal.
   *
   * @param {number} bytes - file size in bytes
   * @returns {string} formatted size label (e.g., "12.3 KB")
   */
  formatFileSizeKB(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
}
