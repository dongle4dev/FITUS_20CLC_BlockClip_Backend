let constants = require("../../config/constants");
const helper = require("../utils/helper");
const prisma = require("../../prisma");
const config = require("../../config/config");
const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK(config.PINATA_API_KEY, config.PINATA_API_SECRET);
const fs = require("fs");
const path = require("path");
const { get } = require("http");

class ReportService {
  async createReport(params) {
    try {
      const { wallet, owner, tokenID, description, status } = params;

      const report = await prisma.reports.create({
        data: {
          sender: { connect: { wallet: wallet } },
          owner: { connect: { wallet: owner } },
          token: { connect: { tokenID: tokenID } },
          description,
          status,
        },
      });

      return report;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getReports(params) {
    try {
      const { limit, offset, orderBy } = params;

      const count = await prisma.reports.count();
      const reports = await prisma.reports.findMany({
        orderBy,
        take: limit,
        skip: offset,
      });

      return { reports, count };
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getReportByID(params) {
    try {
      const { id } = params;

      const report = await prisma.reports.findUnique({
        where: { id: id },
      });

      return report;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateReport(params) {
    try {
      const { id, status: params_status } = params;
      const { status: current_status } = await this.getReportByID({ id });

      const report = await prisma.reports.update({
        where: { id: id },
        data: {
          status: params_status !== null ? params_status : current_status,
        },
      });

      return report;
    } catch (err) {
      console.log(err);
      throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = ReportService;
