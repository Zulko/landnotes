import json
from functools import lru_cache
import zlib

from wiki_dump_extractor import date_utils


class LLMEventProcessor:
    def __init__(
        self,
        page_index_db,
        redirects_db,
        disambiguation_dict,
        locations_by_title_db,
        page_links_db,
    ):
        self.page_index_db = page_index_db
        self.redirects_db = redirects_db
        self.disambiguation_dict = disambiguation_dict
        self.locations_by_title_db = locations_by_title_db
        self.page_links_db = page_links_db

    def get_redirect(self, title):
        result = self.redirects_db.get(title.encode())
        if result is not None:
            return result.decode()
        return None

    def get_events_for_page(self, title):
        result = self.page_index_db.get(title.encode())
        if result is not None:
            return json.loads(result.decode())["events"]

    @lru_cache(maxsize=1000)
    def get_geodata(self, name):
        result = self.locations_by_title_db.get(name.encode())
        if result is not None:
            return json.loads(result.decode())

    def identify_place(self, string, page_links):
        if string == "":
            return None, None
        if "|" in string:
            results = [
                self.identify_place(s, page_links=page_links) for s in string.split("|")
            ]
            results = [r for r in results if r[0] is not None]
            if len(results) == 1:
                return results[0]
            elif len(results) == 0:
                return None, None
            else:
                return results

        is_guess = string.endswith("?")
        string = string.strip("?").strip()
        if (string == "") or (string.lower() == "unknown"):
            return None, None

        if page_links is not None:
            maybe_link = page_links.get(string.encode())
            if maybe_link and (maybe_link != string):
                if isinstance(maybe_link, list) and len(set(maybe_link)) == 1:
                    maybe_link = maybe_link[0]
                if (
                    not isinstance(maybe_link, list)
                    and not maybe_link.startswith("Category:")
                    and not maybe_link.startswith("List of")
                ):
                    geodata = self.get_geodata(maybe_link)
                    if geodata is not None:
                        return geodata, is_guess

        if (geodata := self.get_geodata(string)) is not None:
            return (geodata, is_guess)
        if (redirect := self.get_redirect(string)) is not None:
            if (redirect_geodata := self.get_geodata(redirect)) is not None:
                return redirect_geodata, is_guess

        if "," in string:
            string = string.split(",")[0]
            result, is_guess = self.identify_place(string, page_links=page_links)
            if result is not None:
                return result, is_guess
        if "(City)" not in string:
            string = string + " (City)"
            result, is_guess = self.identify_place(string, page_links=page_links)
            if result is not None:
                return result, is_guess
        return None, None

    def identify_person(self, person, page_links):
        page_name = self.get_page_title(person, page_links)
        return page_name if page_name is not None else person + " (?)"

    def get_page_title(self, name, page_links=None):
        """Return the name if it is in the page index, or the redirect name if
        it is in the redirects db.
        """
        if page_links is not None:
            maybe_link = page_links.get(name)
            if maybe_link and maybe_link != name:
                if isinstance(maybe_link, list) and len(set(maybe_link)) == 1:
                    maybe_link = maybe_link[0]
                if (
                    not isinstance(maybe_link, list)
                    and not maybe_link.startswith("Category:")
                    and not maybe_link.startswith("List of")
                ):
                    result = self.get_page_title(maybe_link)
                    if result is not None:
                        return result

        result = self.page_index_db.get(name.encode())
        if result is not None:
            return name

        redirect = self.get_redirect(name)
        if redirect is not None:
            result = self.page_index_db.get(redirect.encode())
            if result is not None:
                return redirect
        return None

    def attribute_category(self, summary):
        categories_dict = {
            "birth": ["birth", "born"],
            "death": ["death", "died", "deceased", "funeral", "buried", "burial"],
            "award": ["award", "prize", "medal", "decorated"],
            "release": ["release", "premiere", "performance", "concert", "publish"],
            "work": ["became", "began", "appointed"],
            "travel": ["travel", "moved to", "toured", "visit"],
        }
        summary = summary.lower()
        for category, keywords in categories_dict.items():
            if any(keyword in summary for keyword in keywords):
                return category
        return "other"

    def process_event(
        self,
        event,
        page_title,
        event_index,
        raw_events_by_month_and_region_writer,
        raw_page_and_year_writer,
        event_sql_writer,
        date_errors,
        no_location,
        counts,
        maybe_page_title_location,
        page_links,
    ):
        if event["when"].lower() in ["unknown", "n/a", "yyyy", "none"]:
            return
        event_data = {
            "event_id": f"{page_title.replace(' ', '_')}_{event_index:03d}",
            "page_title": page_title,
            "page_section": event["section"],
            "when": event["when"],
            "summary": event["what"],
        }
        where, city = event["where"], event["city"]
        event_data["location"] = where if (city in where) else f"{where}, {city}"

        try:
            date_range = date_utils.DateRange.from_parsed_string(event["when"])
            event_data["start_date"] = date_range.start.to_string()
            event_data["end_date"] = date_range.end.to_string()
        except Exception as e:
            date_errors.append((event["when"], str(e)))
            return
        event_data["category"] = self.attribute_category(event["what"])

        event_data["people"] = [
            self.identify_person(person, page_links)
            for person in event["who"].split("|")
            if person != ""
        ]
        where_geolocation = self.identify_place(event["where"], page_links=page_links)
        city_geolocation = self.identify_place(event["city"], page_links=page_links)

        if where_geolocation == (None, None) and city_geolocation == (None, None):
            if maybe_page_title_location == (None, None):
                no_location.append("where: " + event["where"])
                no_location.append("city: " + event["city"])
                return
            else:
                where_geolocation = maybe_page_title_location
            return
        if not isinstance(where_geolocation, list):
            where_geolocation = [where_geolocation]
        if not isinstance(city_geolocation, list):
            city_geolocation = [city_geolocation]
        event_data["where_page_title"] = "|".join(
            list(
                set(
                    w["page_title"].replace("_", " ") for w, _ in where_geolocation if w
                )
            )
        )
        event_data["where_is_guess"] = any(
            is_guess for _, is_guess in where_geolocation
        )
        event_data["city_page_title"] = "|".join(
            list(
                set(c["page_title"].replace("_", " ") for c, _ in city_geolocation if c)
            )
        )
        event_data["city_is_guess"] = any(is_guess for _, is_guess in city_geolocation)
        if where_geolocation != [(None, None)]:
            geolocations = where_geolocation
        else:
            geolocations = city_geolocation

        counts["events_with_location"] += 1

        years_range = list(range(date_range.start.year, date_range.end.year + 1))
        year_months = date_range_to_year_months(date_range)

        for year, month in year_months:
            for g, _ in geolocations:
                if g is None:
                    continue
                record = {
                    "month_region": f"{year}-{month if month is not None else ''}-{g['geohash4'][0]}",
                    "event_id": event_data["event_id"],
                    "geohash4": g["geohash4"],
                    "start_date": event_data["start_date"],
                    "end_date": event_data["end_date"],
                }
                raw_events_by_month_and_region_writer.add_record_to_db_table(record)
        for year in years_range:
            for page in (
                [g["page_title"] for (g, _) in where_geolocation if g]
                + [c["page_title"] for (c, _) in city_geolocation if c]
                + [event_data["page_title"]]
                + event_data["people"]
            ):
                if page is None or page.endswith("(?)"):
                    continue
                record = {
                    "page_title": page,
                    "year": year,
                    "event_id": event_data["event_id"],
                }
                raw_page_and_year_writer.add_record_to_db_table(record)

        event_data["people"] = "|".join(event_data["people"])
        event_data["geohash4"] = "|".join([g["geohash4"] for g, _ in geolocations])

        event_sql_writer.add_record_to_db_table(event_data)

    def process_events_in_page(
        self,
        page_title,
        page_events,
        counts,
        raw_events_by_month_and_region_writer,
        raw_page_and_year_writer,
        event_sql_writer,
        date_errors,
        no_location,
    ):
        zipped_page_links = self.page_links_db.get(page_title.encode())
        page_links = json.loads(zlib.decompress(zipped_page_links).decode())
        maybe_page_title_location = self.identify_place(
            page_title, page_links=page_links
        )

        for i, event in enumerate(page_events):
            self.process_event(
                event=event,
                page_title=page_title,
                event_index=i,
                page_links=page_links,
                maybe_page_title_location=maybe_page_title_location,
                raw_events_by_month_and_region_writer=raw_events_by_month_and_region_writer,
                raw_page_and_year_writer=raw_page_and_year_writer,
                event_sql_writer=event_sql_writer,
                date_errors=date_errors,
                no_location=no_location,
                counts=counts,
            )


def date_range_to_year_months(date_range):
    year, month = date_range.start.year, date_range.start.month
    end_year, end_month = date_range.end.year, date_range.end.month
    result = []
    while (year, month) <= (end_year, end_month):
        if month == 1 and (year, 12) <= (end_year, end_month):
            result.append((year, None))
            year += 1
        else:
            result.append((year, month))
            month += 1
            if month == 13:
                month = 1
                year += 1
    return result


def process_infobox_event(
    event_data,
    counts,
    raw_events_by_month_and_region_writer,
    raw_page_and_year_writer,
    event_sql_writer,
):
    counts["total_events"] += 1
    if event_data["date"].strip() == "":
        counts["errored_events"] += 1
        return
    if not isinstance(event_data["place"], list):
        event_data["place"] = [event_data["place"]]
    if "people" not in event_data:
        event_data["people"] = []

    event_data.update(
        {
            "when": event_data["date"],
            "summary": event_data["event_type"],
            "category": event_data["event_type"],
        }
    )
    try:
        date_range = date_utils.DateRange.from_parsed_string(event_data["when"])
    except Exception as e:
        raise (e)
    event_data["start_date"] = date_range.start.to_string()
    event_data["end_date"] = date_range.end.to_string()
    event_data["where_page_title"] = "|".join(
        [place["page_title"] for place in event_data["place"]]
    )
    event_data["location"] = event_data["where_page_title"]
    geolocations = event_data["place"]

    years_range = list(range(date_range.start.year, date_range.end.year + 1))
    year_months = date_range_to_year_months(date_range)

    for year, month in year_months:
        for g in geolocations:
            if g is None:
                continue
            record = {
                "month_region": f"{year}-{month if month is not None else ''}-{g['geohash4'][0]}",
                "event_id": event_data["event_id"],
                "geohash4": g["geohash4"],
                "start_date": event_data["start_date"],
                "end_date": event_data["end_date"],
            }
            raw_events_by_month_and_region_writer.add_record_to_db_table(record)

    for year in years_range:
        for page in (
            [g["page_title"] for g in geolocations if g]
            + [event_data["page_title"]]
            + event_data["people"]
        ):
            if page is None or page.endswith("(?)"):
                continue
            record = {
                "page_title": page,
                "year": year,
                "event_id": event_data["event_id"],
            }
            raw_page_and_year_writer.add_record_to_db_table(record)

    event_data["people"] = "|".join(event_data["people"])
    event_data["geohash4"] = "|".join([g["geohash4"] for g in geolocations])

    for field in "date", "event_type", "place", "event_category":
        event_data.pop(field, None)

    event_sql_writer.add_record_to_db_table(record=event_data)
