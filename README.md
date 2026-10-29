# Life in Stars

Personalised 60-second videos of a whole life, drawn as stars.

You type the people in your life, how they're related to you and roughly when they came and went. We turn it into a
vertical video where each person is a line of light beside your own, and the ones who have passed away rise as stars
that join into your family's constellation.

**Order:** https://stars.lohiyaanirudh.tech · **Instagram:** [@life.instars](https://www.instagram.com/life.instars/)

| Plan | People | Delivered | Price |
|---|---|---|---|
| Basic | up to 8 | within 3 days | ₹199 (about $2.99) |
| Family | up to 15 | within 3 days | ₹349 (about $4.99) |
| Rush | up to 15 | within 12 hours | ₹499 (about $6.99) |

Every video is checked by a person before it's sent, with one free correction within 7 days and a full refund if it's late.

## This repository

The static website, served by GitHub Pages from `main` (custom domain in `CNAME`). Orders go from the form to an
automation backend that takes payment through Razorpay and makes the video; none of that code lives here.

| File | What it is |
|---|---|
| `index.html` | The landing page and order form (built from a separate source, see below) |
| `chapters.css`, `life.js` | Page styles and the scroll-driven sample life |
| `scrollcraft.css`, `scrollcraft.js` | Scroll animation engine |
| `life/` | The video renderer, reused on the page to play a sample life as you scroll |
| `sample.mp4`, `sample.jpg` | Sample video (sample names only) and its preview image |
| `thanks.html` | Shown after payment |
| `contact.html`, `privacy.html`, `refund.html`, `terms.html`, `style.css` | Policy and contact pages |

`index.html` is generated, so edit its source rather than the file itself, then copy the built files here.

## Run it locally

```bash
npx http-server@14.1.1 . -p 8000 -c-1
```

Then open http://localhost:8000. Placing an order from a local copy still reaches the live backend, so don't submit test orders unless you mean to.
