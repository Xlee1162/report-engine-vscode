class MailSender {
  constructor(mailAdapter, logger) {
    this.mailAdapter = mailAdapter;
    this.logger = logger;
  }

  async send({ mailConfig, html, attachments }) {
    if (this.mailAdapter && typeof this.mailAdapter.send === "function") {
      return this.mailAdapter.send({ mailConfig, html, attachments });
    }

    this.logger.warn("Mail adapter not configured. Email not sent.", {
      to: mailConfig.to,
      subject: mailConfig.subject,
      attachments: attachments || [],
    });

    return {
      status: "skipped",
    };
  }
}

module.exports = {
  MailSender,
};
