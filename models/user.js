const bcrypt = require("bcrypt")
const { BCRYPT_WORK_FACTOR } = require("../config")
const db = require("../db")
const { BadRequestError, UnauthorizedError } = require("../utils/errors")

class User {
  static makePublicUser(user) {
    return {
      id: user.id,
      email: user.email,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
    }
  }

  static async login(credentials) {
    const requiredFields = ["email", "password"]
    requiredFields.forEach((property) => {
      if (!credentials.hasOwnProperty(property)) {
        throw new BadRequestError(`Missing ${property} in request body.`)
      }
    })

    const user = await User.fetchUserByEmail(credentials.email)
    if (user) {
      const isValid = await bcrypt.compare(credentials.password, user.password)
      if (isValid) {
        return User.makePublicUser(user)
      }
    }

    throw new UnauthorizedError("Invalid username/password")
  }

  static async register(credentials) {
    const requiredFields = ["email", "password", "isAdmin"]
    requiredFields.forEach((property) => {
      if (!credentials.hasOwnProperty(property)) {
        throw new BadRequestError(`Missing ${property} in request body.`)
      }
    })

    if (credentials.email.indexOf("@") === -1) {
      throw new BadRequestError("Invalid email.")
    }

    const existingUserWithEmail = await User.fetchUserByEmail(credentials.email)
    if (existingUserWithEmail) {
      throw new BadRequestError(`Duplicate email: ${credentials.email}`)
    }

    const hashedPassword = await bcrypt.hash(credentials.password, BCRYPT_WORK_FACTOR)
    const normalizedEmail = credentials.email.toLowerCase()

    // execute multiple dependent queries in a transaction
    try {
      await db.query(`BEGIN`)

      // create new user
      const userResult = await db.query(
        `INSERT INTO users (email, password, is_admin)
         VALUES ($1, $2, $3)
         RETURNING id, email, is_admin, created_at;
        `,
        [normalizedEmail, hashedPassword, credentials.isAdmin]
      )
      const user = userResult.rows[0]
      // create profile for that user
      await db.query(`INSERT INTO profiles (user_id) VALUES ($1)`, [user.id])
      await db.query(`COMMIT`)

      return user
    } catch (e) {
      console.log({ e })
      await client.query(`ROLLBACK`)
      throw new BadRequestError("Something went wrong with user registration.")
    }
  }

  static async fetchUserByEmail(email) {
    if (!email) {
      throw new BadRequestError("No email provided")
    }

    const query = `SELECT * FROM users WHERE email = $1`

    const result = await db.query(query, [email.toLowerCase()])

    const user = result.rows[0]

    return user
  }
}

module.exports = User
